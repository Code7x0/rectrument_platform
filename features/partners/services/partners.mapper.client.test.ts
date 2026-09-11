import assert from "node:assert/strict";
import test from "node:test";

import { PARTNERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { toAirtableCreateFields } from "@/features/partners/services/partners.mapper";

test("client-mode partner create skips app-only verification field", () => {
  const prev = process.env.AIRTABLE_COMPAT_MODE;
  process.env.AIRTABLE_COMPAT_MODE = "client";

  const fields = toAirtableCreateFields({
    companyName: "Sonu Kumar",
    contactName: "Sonu Kumar",
    email: "tryu@gmail.com",
    phone: "8252167742",
    specialization: "IT, Healthcare",
    status: "pending",
    verificationStatus: "pending",
    identityVisibility: "private",
    city: "ARA",
    state: "Gujarat",
    skills: "IT",
    experience: "0-1 year",
    notes: "registration notes",
  });

  assert.equal(fields[PARTNERS_TABLE_FIELDS.status], "Probation");
  assert.equal(fields[PARTNERS_TABLE_FIELDS.verificationStatus], undefined);
  assert.equal(fields[PARTNERS_TABLE_FIELDS.identityVisibility], undefined);
  assert.equal(fields[PARTNERS_TABLE_FIELDS.city], "ARA");
  assert.ok(fields[PARTNERS_TABLE_FIELDS.specialization]);

  process.env.AIRTABLE_COMPAT_MODE = prev;
});
