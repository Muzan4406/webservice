import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIMPAY_COUNTRIES,
  DRIMPAY_LIVE_API_BASE,
  findDrimPayOperator,
  getDrimPayApiKey,
  verifyDrimPayWebhookSignature,
} from "./drimpay";

test("DrimPay integration is pinned to the live API", () => {
  assert.equal(DRIMPAY_LIVE_API_BASE, "https://drimpay.com/api/v2");
  assert.ok(!DRIMPAY_LIVE_API_BASE.includes("sandbox"));
});

test("only documented production country and operator combinations are exposed", () => {
  assert.deepEqual(DRIMPAY_COUNTRIES.map(({ code }) => code), [
    "TG", "BJ", "CM", "BF", "ML", "SN", "CI", "CG",
  ]);
  assert.equal(findDrimPayOperator("TG", "tmoney")?.label, "T-Money");
  assert.equal(findDrimPayOperator("TG", "moov")?.label, "Moov Money");
  assert.equal(findDrimPayOperator("BJ", "celtiis"), undefined);
  assert.equal(findDrimPayOperator("SN", "free"), undefined);
  assert.equal(findDrimPayOperator("NE", "airtel"), undefined);
  assert.equal(findDrimPayOperator("CD", "vodacom"), undefined);
});

test("DrimPay accepts only a live server key", (t) => {
  const previous = process.env.DRIMPAY_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.DRIMPAY_API_KEY;
    else process.env.DRIMPAY_API_KEY = previous;
  });

  process.env.DRIMPAY_API_KEY = "dp_live_sk_unit_test";
  assert.equal(getDrimPayApiKey(), "dp_live_sk_unit_test");

  process.env.DRIMPAY_API_KEY = "dp_sandbox_sk_unit_test";
  assert.throws(() => getDrimPayApiKey(), /clé live/);
});

test("webhook HMAC verifies the raw body and rejects stale or altered requests", () => {
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const secret = "unit-test-webhook-secret";
  const rawBody = Buffer.from('{"event":"payin.success","mode":"live"}');
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  const signature = `t=${timestamp},v1=${digest}`;

  assert.equal(verifyDrimPayWebhookSignature(rawBody, signature, timestamp, secret, now), true);
  assert.equal(
    verifyDrimPayWebhookSignature(Buffer.from(`${rawBody.toString()} `), signature, timestamp, secret, now),
    false,
  );
  assert.equal(verifyDrimPayWebhookSignature(rawBody, signature, String(Number(timestamp) + 1), secret, now), false);
  assert.equal(
    verifyDrimPayWebhookSignature(rawBody, signature, timestamp, secret, now + 301_000),
    false,
  );
});
