import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDialableUssdCode } from "./ussd";

test("builds the T-Money dialer code with the amount and leaves the PIN to the payer", () => {
  assert.equal(
    buildDialableUssdCode("*145*5*MONTANT*1181879*CODE SECRET#", "200"),
    "*145*5*200*1181879*",
  );
});

test("fills a configured Moov USSD template and rejects incomplete templates", () => {
  assert.equal(buildDialableUssdCode("*155*MONTANT*NUMERO#", "500", "90 00 00 00"), "*155*500*90000000#");
  assert.equal(buildDialableUssdCode("*155*MONTANT#", "", null), null);
});
