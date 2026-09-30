import assert from "node:assert/strict";
import test from "node:test";

process.env.AIRTABLE_COMPAT_MODE = "client";

import {
  partnerQueryTypeToAirtableWrite,
  resolvePartnerQueriesTableName,
} from "./partner-query-airtable";

test("partnerQueryTypeToAirtableWrite maps to legacy client select options", () => {
  assert.equal(partnerQueryTypeToAirtableWrite("job_candidate_query"), "Account question");
  assert.equal(partnerQueryTypeToAirtableWrite("platform_feedback"), "Feedback");
});

test("resolvePartnerQueriesTableName rejects truncated Partner env", () => {
  assert.equal(resolvePartnerQueriesTableName("Partner"), "Partner Queries");
  assert.equal(resolvePartnerQueriesTableName("Partner Queries"), "Partner Queries");
});
