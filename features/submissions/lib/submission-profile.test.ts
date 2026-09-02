import assert from "node:assert/strict";
import test from "node:test";

import { buildCandidatesCsvContent } from "@/features/submissions/lib/export-candidates-csv";
import { resolveSubmissionProfile } from "@/features/submissions/lib/submission-profile";
import type { Submission } from "@/features/submissions/types";

function baseSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "rec1",
    submissionCode: "can_abc",
    candidateId: "rec1",
    candidateName: "Jane Doe",
    resumeUrl: null,
    resumeFilename: null,
    linkedIn: null,
    email: "jane@example.com",
    phone: "9999999999",
    jobId: "job1",
    jobTitle: "Engineer",
    jobCode: "cli_eng",
    clientId: null,
    clientName: "Acme",
    clientCode: "cli",
    allocationId: "alloc1",
    partnerId: "par1",
    partnerName: "Partner",
    partnerCode: "par",
    submissionDate: "2026-01-01",
    status: "submitted",
    airtableStatus: "Submitted",
    remarks: null,
    interviewStage: null,
    internalFeedback: null,
    wantsSecondLevelReview: false,
    secondLevelReviewLabel: null,
    jobPriority: null,
    ...overrides,
  };
}

test("resolveSubmissionProfile merges Airtable columns and screening notes", () => {
  const row = baseSubmission({
    currentCtc: "12 LPA",
    expectedCtc: "16 LPA",
    noticePeriod: "30 days",
    currentLocation: "Mumbai",
    remarks: [
      "Current company: Example Corp",
      "Total experience: 5 years",
      "Skill screen:",
      "- React — 4 years",
      "",
      "Offer in hand:",
      "- CTC: 14 LPA",
      "- Company: Other Co",
    ].join("\n"),
  });

  const profile = resolveSubmissionProfile(row);
  assert.equal(profile.currentCompany, "Example Corp");
  assert.equal(profile.experience, "5 years");
  assert.equal(profile.currentCtc, "12 LPA");
  assert.equal(profile.expectedCtc, "16 LPA");
  assert.equal(profile.noticePeriod, "30 days");
  assert.equal(profile.currentLocation, "Mumbai");
  assert.equal(profile.skills, "React (4 years)");
  assert.equal(profile.offerInHandCtc, "14 LPA");
  assert.equal(profile.offerInHandCompany, "Other Co");
});

test("buildCandidatesCsvContent includes profile columns", () => {
  const csv = buildCandidatesCsvContent({
    audience: "partner",
    rows: [
      baseSubmission({
        currentCtc: "10 LPA",
        noticePeriod: "60 days",
        remarks: "Total experience: 3 years",
      }),
    ],
  });

  assert.match(csv, /Current CTC/);
  assert.match(csv, /Notice Period/);
  assert.match(csv, /Total Experience/);
  assert.match(csv, /10 LPA/);
  assert.match(csv, /60 days/);
  assert.match(csv, /3 years/);
});
