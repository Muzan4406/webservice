import { test } from "node:test";
import assert from "node:assert/strict";
import { isVipActive, nextVipExpiration } from "./vip-entitlement.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("legacy VIP remains active until a renewal establishes an expiry", () => {
  assert.equal(isVipActive({ isVip: true, vipExpiresAt: null }, new Date("2026-01-01T00:00:00Z")), true);
});

test("VIP access ends at its exact expiry time", () => {
  const expiry = new Date("2026-01-31T00:00:00Z");
  assert.equal(isVipActive({ isVip: true, vipExpiresAt: expiry }, new Date(expiry.getTime() - 1)), true);
  assert.equal(isVipActive({ isVip: true, vipExpiresAt: expiry }, expiry), false);
  assert.equal(isVipActive({ isVip: false, vipExpiresAt: expiry }, new Date("2026-01-01T00:00:00Z")), false);
});

test("first activation grants 30 days from the confirmation time", () => {
  const activation = new Date("2026-01-01T12:00:00Z");
  assert.equal(nextVipExpiration(null, activation).getTime(), activation.getTime() + 30 * DAY_MS);
});

test("early renewal adds 30 days to the current expiry", () => {
  const activation = new Date("2026-01-10T00:00:00Z");
  const currentExpiry = new Date("2026-01-25T00:00:00Z");
  assert.equal(nextVipExpiration(currentExpiry, activation).getTime(), currentExpiry.getTime() + 30 * DAY_MS);
});

test("renewal after expiry starts a fresh 30-day period", () => {
  const activation = new Date("2026-02-10T00:00:00Z");
  const expired = new Date("2026-01-25T00:00:00Z");
  assert.equal(nextVipExpiration(expired, activation).getTime(), activation.getTime() + 30 * DAY_MS);
});
