import assert from "node:assert/strict";
import test from "node:test";
import {
  ASHTECHPAY_API_BASE,
  ashtechPayRequest,
  AshtechPayError,
  getAshtechPayApiKey,
  getAshtechPayTransaction,
  getAshtechPayUserId,
  normalizeAshtechCountries,
  normalizeAshtechPhone,
  normalizeAshtechStatus,
  toAshtechInternationalPhone,
} from "./ashtechpay.js";

test("uses the live Ashtechpay API host and its documented active catalogue", () => {
  assert.equal(ASHTECHPAY_API_BASE, "https://www.ashtechpay.com");
  const countries = normalizeAshtechCountries([
    {
      code: "TG",
      name: "Togo",
      currency: "XOFT",
      operators: ["Flooz (Moov)", "T-Money"],
    },
    { code: "XX", name: "Unsupported", currency: "XOF", operators: ["Other"] },
  ]);
  assert.equal(countries.length, 1);
  assert.equal(countries[0].callingCode, "228");
  assert.equal(countries[0].currency, "XOFT");
  assert.deepEqual(countries[0].operators.map((item) => item.code), ["Flooz (Moov)", "T-Money"]);
});

test("normalizes national phone numbers and rejects a typed country prefix", () => {
  const [togo] = normalizeAshtechCountries([{
    code: "TG",
    name: "Togo",
    currency: "XOFT",
    operators: ["T-Money"],
  }]);
  assert.equal(normalizeAshtechPhone("71 93 54 94", togo), "71935494");
  assert.equal(normalizeAshtechPhone("+22871935494", togo), null);
  assert.equal(normalizeAshtechPhone("22871935494", togo), null);
  assert.equal(normalizeAshtechPhone("7193549", togo), null);
  assert.equal(toAshtechInternationalPhone("71 93 54 94", togo), "22871935494");
  assert.equal(toAshtechInternationalPhone("+22871935494", togo), null);
});

test("normalizes only documented terminal transaction states", () => {
  assert.equal(normalizeAshtechStatus("completed"), "success");
  assert.equal(normalizeAshtechStatus("success"), "success");
  assert.equal(normalizeAshtechStatus("failed"), "failed");
  assert.equal(normalizeAshtechStatus("pending"), "pending");
});

test("requires a server-only API key", (t) => {
  const previous = process.env.ASHTECHPAY_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.ASHTECHPAY_API_KEY;
    else process.env.ASHTECHPAY_API_KEY = previous;
  });
  delete process.env.ASHTECHPAY_API_KEY;
  assert.throws(() => getAshtechPayApiKey(), /n'est pas configuré/);
  process.env.ASHTECHPAY_API_KEY = "ak_unit_test_key";
  assert.equal(getAshtechPayApiKey(), "ak_unit_test_key");
  process.env.ASHTECHPAY_API_KEY = "hp_live_checkout_key";
  assert.throws(() => getAshtechPayApiKey(), /clé Direct API/);
});

test("requires the non-secret AshTech Pay profile user_id", (t) => {
  const previous = process.env.ASHTECHPAY_USER_ID;
  t.after(() => {
    if (previous === undefined) delete process.env.ASHTECHPAY_USER_ID;
    else process.env.ASHTECHPAY_USER_ID = previous;
  });
  delete process.env.ASHTECHPAY_USER_ID;
  assert.throws(() => getAshtechPayUserId(), /identifiant du profil/);
  process.env.ASHTECHPAY_USER_ID = "ashtech-profile-123";
  assert.equal(getAshtechPayUserId(), "ashtech-profile-123");
});

test("keeps the documented OTP-required 400 response for the second API step", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), `${ASHTECHPAY_API_BASE}/v1/collect`);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer ak_unit_test_key");
    assert.deepEqual(JSON.parse(String(init?.body)), { reference: "dep_ref" });
    return new Response(JSON.stringify({
      error: "otp_required",
      reference: "provider_otp_ref",
      ussd_code: "#144*82#",
    }), { status: 400, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const result = await ashtechPayRequest<{
    error: string;
    reference: string;
    ussd_code: string;
  }>("/v1/collect", "ak_unit_test_key", {
    method: "POST",
    body: { reference: "dep_ref", otp: undefined },
  });
  assert.equal(result.status, 400);
  assert.equal(result.data.error, "otp_required");
  assert.equal(result.data.ussd_code, "#144*82#");
});

test("includes the required user_id query when checking transaction status", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousUserId = process.env.ASHTECHPAY_USER_ID;
  const previousApiKey = process.env.ASHTECHPAY_API_KEY;
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousUserId === undefined) delete process.env.ASHTECHPAY_USER_ID;
    else process.env.ASHTECHPAY_USER_ID = previousUserId;
    if (previousApiKey === undefined) delete process.env.ASHTECHPAY_API_KEY;
    else process.env.ASHTECHPAY_API_KEY = previousApiKey;
  });
  process.env.ASHTECHPAY_USER_ID = "ashtech-profile-123";
  process.env.ASHTECHPAY_API_KEY = "ak_unit_test_key";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(
      String(input),
      `${ASHTECHPAY_API_BASE}/v1/transaction/tx-123?user_id=ashtech-profile-123`,
    );
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer ak_unit_test_key");
    return new Response(JSON.stringify({ transaction_id: "tx-123", status: "pending" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const result = await getAshtechPayTransaction("tx-123");
  assert.equal(result.status, "pending");
});

test("marks a timed-out collect as an unknown outcome, not a failed payment", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = (async () => { throw new Error("network unavailable"); }) as typeof fetch;
  await assert.rejects(
    ashtechPayRequest("/v1/collect", "ak_unit_test_key", { method: "POST", body: { amount: 500 } }),
    (error: unknown) => error instanceof AshtechPayError && error.outcomeUnknown,
  );
});

test("does not treat an authorization failure as a successful payment", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })) as typeof fetch;
  await assert.rejects(
    ashtechPayRequest("/v1/countries", "invalid_test_key"),
    (error: unknown) => error instanceof AshtechPayError && error.statusCode === 503,
  );
});
