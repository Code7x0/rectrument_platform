import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAccountManagersTableName,
  resolvePartnerQueriesTableName,
} from "./resolve-table-names";

test("resolveAccountManagersTableName handles truncated Account env", () => {
  assert.equal(resolveAccountManagersTableName("Account"), "Account Managers");
  assert.equal(
    resolveAccountManagersTableName("Account Managers"),
    "Account Managers",
  );
});

test("resolvePartnerQueriesTableName handles truncated Partner env", () => {
  assert.equal(resolvePartnerQueriesTableName("Partner"), "Partner Queries");
  assert.equal(
    resolvePartnerQueriesTableName("Partner Queries"),
    "Partner Queries",
  );
});
