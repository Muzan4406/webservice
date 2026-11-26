import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeNationalPhoneInput } from "./national-phone";

test("keeps a local number and removes a pasted country prefix", () => {
  assert.equal(normalizeNationalPhoneInput("71935494", "228", 8), "71935494");
  assert.equal(normalizeNationalPhoneInput("+228 71 93 54 94", "228", 8), "71935494");
  assert.equal(normalizeNationalPhoneInput("22871935494", "228", 8), "71935494");
});
