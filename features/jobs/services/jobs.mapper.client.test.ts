import assert from "node:assert/strict";
import test from "node:test";

process.env.AIRTABLE_COMPAT_MODE = "client";

import {
  mapJobRecord,
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "./jobs.mapper";
import {
  AIRTABLE_JOB_PRIORITY,
  AIRTABLE_JOB_STATUS,
  CLIENTS_TABLE_FIELDS,
  DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  DOMAIN_JOB_STATUS_TO_AIRTABLE,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { JOB_STATUS_LABELS } from "@/features/shared/entities/job.entity";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import type { Job } from "@/features/jobs/types";

const maps = {
  status: DOMAIN_JOB_STATUS_TO_AIRTABLE,
  priority: DOMAIN_JOB_PRIORITY_TO_AIRTABLE,
  employmentType: {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
  } as const,
};

test("client-mode create does not send Open Positions or Skills", () => {
  const fields = toAirtableCreateFields(
    {
      title: "IFS Developer",
      clientId: "recClient",
      openPositions: 3,
      skills: ["Java", "IFS"],
      status: "open",
      priority: "urgent",
      employmentType: "full_time",
      description: "Build IFS integrations",
    },
    maps,
    { jobCode: "BCE_001" },
  );

  assert.equal(fields["Open Positions"], undefined);
  assert.equal(fields.Skills, undefined);
  assert.equal(fields["Employment Type"], undefined);
  assert.equal(fields["Assigned Account Manager"], undefined);
  assert.equal(fields[JOBS_TABLE_FIELDS.jobId], "BCE_001");
  assert.equal(fields[JOBS_TABLE_FIELDS.status], "Active");
  assert.equal(fields[JOBS_TABLE_FIELDS.priority], "Super High");
  assert.match(String(fields[JOBS_TABLE_FIELDS.notes]), /\[RP_JOBID\]\s+BCE_001/);
});

test("client-mode update does not send Open Positions or Skills", () => {
  const fields = toAirtableUpdateFields(
    {
      title: "IFS Developer",
      openPositions: 5,
      skills: ["React"],
      status: "hold_by_client",
      priority: "high",
    },
    maps,
  );

  assert.equal(fields["Open Positions"], undefined);
  assert.equal(fields.Skills, undefined);
  assert.equal(fields[JOBS_TABLE_FIELDS.status], "Hold by Client");
  assert.equal(fields[JOBS_TABLE_FIELDS.priority], "High");
});

test("Hold by us / Hold by Client round-trip preserves subtype", () => {
  assert.equal(AIRTABLE_JOB_STATUS["Hold by us"], "hold_by_us");
  assert.equal(AIRTABLE_JOB_STATUS["Hold by Client"], "hold_by_client");
  assert.equal(DOMAIN_JOB_STATUS_TO_AIRTABLE.hold_by_us, "Hold by us");
  assert.equal(DOMAIN_JOB_STATUS_TO_AIRTABLE.hold_by_client, "Hold by Client");

  const holdByUs = mapJobRecord({
    id: "rec1",
    fields: { Status: "Hold by us", "Job Title": "Role A" },
  });
  assert.equal(holdByUs.status, "hold_by_us");
  assert.equal(JOB_STATUS_LABELS[holdByUs.status], "Hold by us");

  const holdByClient = mapJobRecord({
    id: "rec2",
    fields: { Status: "Hold by Client", "Job Title": "Role B" },
  });
  assert.equal(holdByClient.status, "hold_by_client");
  assert.equal(JOB_STATUS_LABELS[holdByClient.status], "Hold by Client");

  const writeUs = toAirtableUpdateFields({ status: "hold_by_us" }, maps);
  assert.equal(writeUs.Status, "Hold by us");

  const writeClient = toAirtableUpdateFields(
    { status: "hold_by_client" },
    maps,
  );
  assert.equal(writeClient.Status, "Hold by Client");
  assert.notEqual(writeClient.Status, "Hold by us");
});

test("Closed by us / Closed Alternatively round-trip preserves subtype", () => {
  assert.equal(AIRTABLE_JOB_STATUS["Closed by us"], "closed_by_us");
  assert.equal(
    AIRTABLE_JOB_STATUS["Closed Alternatively"],
    "closed_alternatively",
  );

  const closedAlt = mapJobRecord({
    id: "rec3",
    fields: { Status: "Closed Alternatively", "Job Title": "Role C" },
  });
  assert.equal(closedAlt.status, "closed_alternatively");
  assert.equal(
    JOB_STATUS_LABELS[closedAlt.status],
    "Closed Alternatively",
  );

  const write = toAirtableUpdateFields(
    { status: "closed_alternatively" },
    maps,
  );
  assert.equal(write.Status, "Closed Alternatively");
});

test("Active / Inactive continue working", () => {
  assert.equal(AIRTABLE_JOB_STATUS.Active, "open");
  assert.equal(AIRTABLE_JOB_STATUS.Inactive, "cancelled");
  assert.equal(DOMAIN_JOB_STATUS_TO_AIRTABLE.open, "Active");
  assert.equal(DOMAIN_JOB_STATUS_TO_AIRTABLE.cancelled, "Inactive");
});

test("priority round-trip: Urgent ↔ Super High", () => {
  assert.equal(AIRTABLE_JOB_PRIORITY["Super High"], "urgent");
  assert.equal(DOMAIN_JOB_PRIORITY_TO_AIRTABLE.urgent, "Super High");

  const mapped = mapJobRecord({
    id: "rec3",
    fields: {
      Status: "Active",
      "Job Title": "Role",
      Priority: "Super High",
    },
  });
  assert.equal(mapped.priority, "urgent");

  const write = toAirtableCreateFields(
    {
      title: "Role",
      clientId: "recC",
      priority: "urgent",
      status: "open",
    },
    maps,
  );
  assert.equal(write.Priority, "Super High");
  assert.notEqual(write.Priority, "Urgent");
});

test("Job ID prefers field then RP_JOBID marker", () => {
  const fromField = mapJobRecord({
    id: "rec4",
    fields: {
      "Job Title": "IFS Developer",
      "Job ID": "BCE_010",
      Comments: "[RP_JOBID] BCE_999\nother",
    },
  });
  assert.equal(fromField.jobCode, "BCE_010");
  assert.equal(fromField.title, "IFS Developer");

  const fromMarker = mapJobRecord({
    id: "rec5",
    fields: {
      "Job Title": "IFS Developer",
      Comments: "[RP_JOBID] BCE_022\nnotes",
    },
  });
  assert.equal(fromMarker.jobCode, "BCE_022");
});

test("Clients Work Days/Week field constant is correct", () => {
  assert.equal(CLIENTS_TABLE_FIELDS.workDaysInWeek, "Work Days/Week");
});

test("priority sorting ignores status subtype", () => {
  function job(
    partial: Partial<Job> & Pick<Job, "id" | "title" | "priority" | "status">,
  ): Job {
    return {
      jobCode: "",
      clientId: null,
      clientName: null,
      clientCode: null,
      accountManagerId: null,
      accountManagerIds: [],
      accountManagerName: null,
      accountManagerUnassigned: false,
      hiringManager: null,
      description: null,
      documents: [],
      location: null,
      workMode: null,
      employmentType: null,
      experience: null,
      salary: null,
      possiblePayout: null,
      openPositions: null,
      skills: [],
      notes: null,
      department: null,
      interviewProcess: null,
      seniorityLevel: null,
      createdById: null,
      createdAt: null,
      startDate: null,
      postedDate: "2024-01-01",
      ...partial,
    };
  }

  const jobs = [
    job({
      id: "low-active",
      title: "Low Active",
      priority: "low",
      status: "open",
    }),
    job({
      id: "high-hold-client",
      title: "High Hold Client",
      priority: "high",
      status: "hold_by_client",
    }),
    job({
      id: "high-active",
      title: "High Active",
      priority: "high",
      status: "open",
    }),
  ];

  const sorted = [...jobs].sort(compareJobsByPriorityThenOpenDate);
  assert.deepEqual(
    sorted.map((row) => row.id),
    ["high-active", "high-hold-client", "low-active"],
  );
});
