import assert from "node:assert/strict";
import test from "node:test";
import {
  ASHTECHPAY_API_BASE,
  ashtechPayRequest,
  AshtechPayError,
  getAshtechPayApiKey,
  normalizeAshtechCountries,
  normalizeAshtechPhone,
  normalizeAshtechStatus,
} from "./ashtechpay.js";

test("uses the live Ashtechpay API host and its documented active catalogue", () => {
  assert.equal(ASHTECHPAY_API_BASE, "https://ashtechpay.com");
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
  process.env.ASHTECHPAY_API_KEY = "unit_test_key";
  assert.equal(getAshtechPayApiKey(), "unit_test_key");
});

test("keeps the documented OTP-required 400 response for the second API step", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), `${ASHTECHPAY_API_BASE}/v1/collect`);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer unit_test_key");
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
  }>("/v1/collect", "unit_test_key", {
    method: "POST",
    body: { reference: "dep_ref", otp: undefined },
  });
  assert.equal(result.status, 400);
  assert.equal(result.data.error, "otp_required");
  assert.equal(result.data.ussd_code, "#144*82#");
});

test("marks a timed-out collect as an unknown outcome, not a failed payment", async (t) => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });
  globalThis.fetch = (async () => { throw new Error("network unavailable"); }) as typeof fetch;
  await assert.rejects(
    ashtechPayRequest("/v1/collect", "unit_test_key", { method: "POST", body: { amount: 500 } }),
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
