import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDuplicateCandidatePolicy } from "@/features/submissions/lib/duplicate-candidate-policy";
import type { Submission } from "@/features/submissions/types";

function submission(
  overrides: Partial<Submission> & { airtableStatus: string },
): Submission {
  return {
    id: "sub1",
    submissionCode: "S1",
    candidateId: "cand1",
    candidateName: "Test",
    jobId: "job1",
    jobTitle: "Role",
    jobCode: null,
    clientId: null,
    clientName: null,
    partnerId: "partner1",
    partnerCode: null,
    partnerName: null,
    accountManagerId: null,
    accountManagerName: null,
    allocationId: null,
    status: "rejected",
    interviewStage: null,
    currentCtc: null,
    expectedCtc: null,
    noticePeriod: null,
    experience: null,
    location: null,
    skills: null,
    resumeUrl: null,
    resumeFilename: null,
    submissionDate: "2026-08-01T00:00:00.000Z",
    lastUpdated: null,
    remarks: null,
    ...overrides,
  } as Submission;
}

test("rejected / hold / backout → block and alert AM", () => {
  const rejected = evaluateDuplicateCandidatePolicy([
    submission({ airtableStatus: "Rejected Resume Review-TS" }),
  ]);
  assert.equal(rejected.action, "block_alert_am");

  const hold = evaluateDuplicateCandidatePolicy([
    submission({ airtableStatus: "Hold", status: "internal_review" }),
  ]);
  assert.equal(hold.action, "block_alert_am");

  const backout = evaluateDuplicateCandidatePolicy([
    submission({ airtableStatus: "Candidate Backed Out" }),
  ]);
  assert.equal(backout.action, "block_alert_am");
});

test("active interviewing → block and show status without requiring AM alert path", () => {
  const result = evaluateDuplicateCandidatePolicy([
    submission({
      airtableStatus: "Interviewing",
      status: "interview",
    }),
  ]);
  assert.equal(result.action, "block_show_status");
  if (result.action === "block_show_status") {
    assert.match(result.message, /Interviewing/i);
  }
});
