#!/usr/bin/env node
/**
 * Smoke-test critical CRM writes fixed this week (partner feedback, clients, jobs).
 * Usage: node --env-file=.env.local --import tsx scripts/smoke-crm-weekly-fixes.mjs
 */
import assert from "node:assert/strict";

const failures = [];
let passCount = 0;

function fail(label, error) {
  const message = error instanceof Error ? error.message : String(error);
  failures.push({ label, message });
  console.error(`✗ ${label}: ${message}`);
}

function pass(label) {
  passCount += 1;
  console.log(`✓ ${label}`);
}

async function main() {
  process.env.AIRTABLE_COMPAT_MODE =
    process.env.AIRTABLE_COMPAT_MODE ?? "client";

  const { partnerQueryTypeToAirtableWrite } = await import(
    "../features/feedback/lib/partner-query-airtable.ts",
  );
  const { resolvePartnerQueriesTableName, resolveAccountManagersTableName } =
    await import("../lib/airtable/resolve-table-names.ts");
  const { toAirtableUpdateFields: jobUpdateFields } = await import(
    "../features/jobs/services/jobs.mapper.ts",
  );
  const { DOMAIN_JOB_STATUS_TO_AIRTABLE, DOMAIN_JOB_PRIORITY_TO_AIRTABLE } =
    await import("../lib/airtable/fields.ts");
  const { findJobById, patchJob } = await import(
    "../features/jobs/repositories/jobs.repository.ts",
  );
  const { insertPartnerQuery, listPartnerQueriesForPartner } = await import(
    "../features/feedback/repositories/partner-queries.repository.ts"
  );
  const { findClientById, patchClient } = await import(
    "../features/clients/repositories/clients.repository.ts"
  );
  const { toAirtableUpdateFields } = await import(
    "../features/clients/services/clients.mapper.ts"
  );
  const { buildJobPartnerUpdateChanges } = await import(
    "../features/jobs/lib/job-update-changes.ts"
  );
  const { accountManagerAssignedToClient } = await import(
    "../features/clients/services/clients.service.ts"
  );
  const { getRecords } = await import("../lib/airtable/client.ts");

  // --- Config ---
  try {
    const table = resolvePartnerQueriesTableName(
      process.env.AIRTABLE_PARTNER_QUERIES_TABLE,
    );
    assert.equal(table, "Partner Queries");
    pass("Partner Queries table name resolves correctly");
  } catch (e) {
    fail("Partner Queries table name", e);
  }

  try {
    assert.equal(partnerQueryTypeToAirtableWrite("job_candidate_query"), "Account question");
    assert.equal(partnerQueryTypeToAirtableWrite("platform_feedback"), "Feedback");
    pass("Partner query type → Airtable select mapping");
  } catch (e) {
    fail("Partner query type mapping", e);
  }

  // --- Partner feedback create ---
  let partnerId = null;
  let testQueryId = null;
  try {
    const partners = await getRecords(
      process.env.AIRTABLE_PARTNERS_TABLE || "Partners",
      { maxRecords: 1 },
    );
    partnerId = partners[0]?.id ?? null;
    if (!partnerId) {
      throw new Error("No partner records in base");
    }
    const created = await insertPartnerQuery({
      partnerId,
      partnerCode: "SMOKE",
      accountManagerId: null,
      type: "job_candidate_query",
      message: "Smoke test: partner ASK AM message with enough characters.",
    });
    testQueryId = created.id;
    const listed = await listPartnerQueriesForPartner(partnerId);
    if (!listed.some((row) => row.id === testQueryId)) {
      throw new Error("Created query not returned by partner list filter");
    }
    pass("Partner feedback / ASK AM → Partner Queries insert + list");
  } catch (e) {
    fail("Partner feedback insert", e);
  }

  for (const type of ["platform_feedback", "account_admin_query"]) {
    if (!partnerId) {
      fail(`Partner query type ${type}`, "no partner id");
      continue;
    }
    try {
      await insertPartnerQuery({
        partnerId,
        partnerCode: "SMOKE",
        accountManagerId: null,
        type,
        message: `Smoke test ${type} message with enough characters here.`,
      });
      pass(`Partner query type ${type} insert`);
    } catch (e) {
      fail(`Partner query type ${type}`, e);
    }
  }

  // --- Super Admin client save (Aerem pattern) ---
  try {
    const clients = await getRecords(
      process.env.AIRTABLE_CLIENTS_TABLE || "Clients",
      { maxRecords: 50 },
    );
    const aerem =
      clients.find((c) =>
        String(c.fields["Client Name"] ?? "")
          .toLowerCase()
          .includes("aerem"),
      ) ?? clients[0];
    if (!aerem) {
      throw new Error("No clients in base");
    }
    const client = await findClientById(aerem.id);
    if (!client) {
      throw new Error("Client not found");
    }
    const fields = toAirtableUpdateFields({
      name: client.name,
      industry: client.industry || "",
      website: client.website || "",
      accountManagerIds: client.accountManagerIds ?? [],
      status: client.status,
      notes: client.notes || "",
      primaryAddress: client.primaryAddress || "",
      modeOfWork: "",
      employeeSize: client.employeeSize || "",
      workDaysInWeek: client.workDaysInWeek ?? 0,
    });
    if (fields["Mode Of Work"] !== undefined) {
      throw new Error("Must not write empty Mode Of Work to Airtable");
    }
    await patchClient(aerem.id, fields);
    pass("Client edit save (empty Mode Of Work + AM fields)");
  } catch (e) {
    fail("Client edit save", e);
  }

  // --- Job partner email change detection ---
  try {
    const changes = buildJobPartnerUpdateChanges(
      {
        id: "recJ1",
        jobCode: "BCE_015",
        title: "T",
        clientId: "recC",
        clientName: null,
        clientCode: null,
        accountManagerId: null,
        accountManagerIds: [],
        accountManagerName: null,
        accountManagerUnassigned: false,
        hiringManager: null,
        description: "Before",
        documents: [],
        location: null,
        workMode: null,
        employmentType: "full_time",
        experience: null,
        salary: null,
        possiblePayout: null,
        priority: "medium",
        openPositions: null,
        skills: [],
        status: "open",
        notes: null,
        department: null,
        interviewProcess: null,
        seniorityLevel: null,
        createdById: null,
        createdAt: null,
        startDate: null,
        postedDate: null,
      },
      {
        id: "recJ1",
        jobCode: "BCE_015",
        title: "T",
        clientId: "recC",
        clientName: null,
        clientCode: null,
        accountManagerId: null,
        accountManagerIds: [],
        accountManagerName: null,
        accountManagerUnassigned: false,
        hiringManager: null,
        description: "Client has 3 interviews process",
        documents: [],
        location: null,
        workMode: null,
        employmentType: "full_time",
        experience: null,
        salary: null,
        possiblePayout: null,
        priority: "medium",
        openPositions: null,
        skills: [],
        status: "open",
        notes: null,
        department: null,
        interviewProcess: null,
        seniorityLevel: null,
        createdById: null,
        createdAt: null,
        startDate: null,
        postedDate: null,
      },
    );
    assert.equal(changes[0]?.field, "Details");
    assert.match(changes[0]?.value ?? "", /3 interviews/);
    pass("Job update partner email Details present value");
  } catch (e) {
    fail("Job update change detection", e);
  }

  // --- AM job save (status patch, no empty select writes) ---
  try {
    const jobs = await getRecords(process.env.AIRTABLE_JOBS_TABLE || "Jobs", {
      maxRecords: 3,
    });
    const jobRec = jobs[0];
    if (!jobRec) {
      throw new Error("No jobs in base");
    }
    const job = await findJobById(jobRec.id);
    const valueMaps = {
      status: DOMAIN_JOB_STATUS_TO_AIRTABLE,
      priority: DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
      employmentType: {
        full_time: "Full-time",
        part_time: "Part-time",
        contract: "Contract",
        internship: "Internship",
      },
    };
    const fields = jobUpdateFields(
      {
        title: job.title,
        clientId: job.clientId ?? "",
        status: job.status,
        priority: job.priority ?? "medium",
        description: job.description ?? "",
        location: job.location ?? "",
        workMode: "",
        hiringManager: job.hiringManager ?? "",
        experience: job.experience ?? "",
        salary: job.salary ?? "",
        notes: job.notes ?? "",
      },
      valueMaps,
    );
    if (fields.Priority === "") {
      throw new Error("Must not write empty Priority select");
    }
    await patchJob(job.id, fields);
    pass("AM-style job save (full form payload, client compat)");
  } catch (e) {
    fail("AM job save", e);
  }

  // --- AM assignment helper ---
  try {
    const clients = await getRecords(
      process.env.AIRTABLE_CLIENTS_TABLE || "Clients",
      { maxRecords: 5 },
    );
    const clientId = clients[0]?.id;
    const amTable = resolveAccountManagersTableName();
    const ams = await getRecords(amTable, { maxRecords: 1 });
    const amId = ams[0]?.id;
    if (clientId && amId) {
      const ok = await accountManagerAssignedToClient(clientId, amId);
      pass(`accountManagerAssignedToClient (${ok ? "linked" : "not linked"}) callable`);
    } else {
      pass("accountManagerAssignedToClient skipped (no client/am row)");
    }
  } catch (e) {
    fail("accountManagerAssignedToClient", e);
  }

  console.log("\n--- Summary ---");
  if (failures.length === 0) {
    console.log(`All ${passCount} checks passed.`);
    process.exit(0);
  }
  console.log(`${failures.length} failure(s):`);
  for (const row of failures) {
    console.log(`  - ${row.label}: ${row.message}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
