import assert from "node:assert/strict";
import test from "node:test";

import { buildJobPartnerUpdateChanges } from "./job-update-changes";
import type { Job } from "@/features/jobs/types";

function sampleJob(partial: Partial<Job>): Job {
  return {
    id: "recJob1",
    jobCode: "BCE_015",
    title: "Role",
    clientId: "recClient",
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
    ...partial,
  };
}

test("buildJobPartnerUpdateChanges includes full Details present value", () => {
  const before = sampleJob({
    description: "Old text",
  });
  const after = sampleJob({
    description: "Client has 3 interviews process",
  });
  const changes = buildJobPartnerUpdateChanges(before, after);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.field, "Details");
  assert.equal(changes[0]?.value, "Client has 3 interviews process");
});

test("buildJobPartnerUpdateChanges detects details when stored in notes", () => {
  const before = sampleJob({ notes: "Before" });
  const after = sampleJob({ notes: "After update" });
  const changes = buildJobPartnerUpdateChanges(before, after);
  assert.equal(changes[0]?.field, "Details");
  assert.equal(changes[0]?.value, "After update");
});
