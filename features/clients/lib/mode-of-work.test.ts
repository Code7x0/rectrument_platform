import assert from "node:assert/strict";
import test from "node:test";

import {
  clientModeOfWorkToAirtable,
  normalizeClientModeOfWorkFromAirtable,
} from "./mode-of-work";

test("normalizeClientModeOfWorkFromAirtable maps WFO with trailing space", () => {
  assert.equal(normalizeClientModeOfWorkFromAirtable("WFO "), "WFO ");
  assert.equal(normalizeClientModeOfWorkFromAirtable("WFO"), "WFO ");
});

test("clientModeOfWorkToAirtable writes exact Airtable choice names", () => {
  assert.equal(clientModeOfWorkToAirtable("WFO"), "WFO ");
  assert.equal(clientModeOfWorkToAirtable("WFO "), "WFO ");
  assert.equal(clientModeOfWorkToAirtable(""), null);
  assert.equal(clientModeOfWorkToAirtable("not-a-choice"), null);
});

test("toAirtableUpdateFields omits Mode Of Work when unset in form", async () => {
  process.env.AIRTABLE_COMPAT_MODE = "client";
  const { toAirtableUpdateFields } = await import(
    "@/features/clients/services/clients.mapper"
  );
  const fields = toAirtableUpdateFields({
    name: "Aerem",
    accountManagerIds: ["recAm1"],
    modeOfWork: "",
    workDaysInWeek: 0,
  });
  assert.equal(fields["Mode Of Work"], undefined);
  assert.equal(fields["Account Owner"], ["recAm1"]);
});
