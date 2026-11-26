import assert from "node:assert/strict";
import test from "node:test";
import { getDatabaseIssue } from "./database-errors.js";

test("reports a missing database configuration without exposing its value", () => {
  assert.equal(getDatabaseIssue(new Error("query failed"), false)?.code, "database_not_configured");
});

test("recognizes a database schema that has not been migrated", () => {
  assert.equal(getDatabaseIssue({ code: "42703" }, true)?.code, "database_schema_outdated");
  assert.equal(getDatabaseIssue({ code: "42P01" }, true)?.code, "database_schema_outdated");
  assert.equal(getDatabaseIssue({ cause: { code: "42703" } }, true)?.code, "database_schema_outdated");
});

test("recognizes database connection failures and leaves unrelated errors alone", () => {
  assert.equal(getDatabaseIssue({ code: "ECONNREFUSED" }, true)?.code, "database_unavailable");
  assert.equal(getDatabaseIssue({ cause: { code: "28P01" } }, true)?.code, "database_unavailable");
  assert.equal(getDatabaseIssue(new Error("application bug"), true), null);
});
