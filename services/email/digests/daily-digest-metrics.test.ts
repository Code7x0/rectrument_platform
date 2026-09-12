import assert from "node:assert/strict";
import test from "node:test";

import type { Submission } from "@/features/submissions/types";

import type { Activity } from "@/features/workflows/types";

import {
  countSlaBreachesForPrimaryAm,
  isSlaBreachedSubmission,
  resolveAmSlaClockStart,
  submissionOwnedByAm,
  submissionPrimaryAmId,
  type JobAmLookup,
} from "./daily-digest-metrics";

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "sub1",
    submissionCode: "YB_001",
    candidateId: "cand1",
    candidateName: "Candidate",
    resumeUrl: null,
    resumeFilename: null,
    linkedIn: null,
    email: null,
    phone: null,
    jobId: "job1",
    jobTitle: "Engineer",
    jobCode: "JOB_001",
    clientId: null,
    clientName: "Client",
    clientCode: null,
    jobPriority: null,
    allocationId: "alloc1",
    partnerId: "partner1",
    partnerName: "Partner",
    partnerCode: null,
    status: "submitted",
    airtableStatus: "Pending Review",
    interviewStage: null,
    remarks: null,
    internalFeedback: null,
    wantsSecondLevelReview: false,
    secondLevelReviewLabel: null,
    submissionDate: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

test("submissionPrimaryAmId uses primary job owner only", () => {
  const jobMap = new Map<string, JobAmLookup>([
    [
      "job1",
      {
        accountManagerId: "am-primary",
        accountManagerIds: ["am-primary", "am-secondary"],
      },
    ],
  ]);

  assert.equal(submissionPrimaryAmId(submission(), jobMap), "am-primary");
  assert.equal(
    submissionOwnedByAm(submission(), jobMap, "am-secondary"),
    true,
  );
  assert.equal(
    countSlaBreachesForPrimaryAm(
      [submission()],
      jobMap,
      "am-secondary",
      new Date("2026-09-10T00:00:00.000Z"),
    ),
    0,
  );
  assert.equal(
    countSlaBreachesForPrimaryAm(
      [submission()],
      jobMap,
      "am-primary",
      new Date("2026-09-10T00:00:00.000Z"),
    ),
    1,
  );
});

test("urgent jobs use shorter SLA window", () => {
  const jobMap = new Map<string, JobAmLookup>([
    [
      "job1",
      {
        accountManagerId: "am-primary",
        accountManagerIds: ["am-primary"],
        priority: "urgent",
      },
    ],
  ]);
  const now = new Date("2026-09-05T12:00:00.000Z");
  assert.equal(
    isSlaBreachedSubmission(
      submission({ submissionDate: "2026-09-04T00:00:00.000Z" }),
      now,
      jobMap,
    ),
    true,
  );
  assert.equal(
    isSlaBreachedSubmission(
      submission({ submissionDate: "2026-09-04T13:00:00.000Z" }),
      now,
      jobMap,
    ),
    false,
  );
});

test("resolveAmSlaClockStart uses latest AM queue entry from activities", () => {
  const activities: Activity[] = [
    {
      id: "a1",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: null,
      toStatus: "submitted",
      actorUserId: null,
      note: "Pending Review",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "a2",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: "submitted",
      toStatus: "rejected",
      actorUserId: null,
      note: "Rejected Resume Review-TS",
      createdAt: "2026-09-03T00:00:00.000Z",
    },
    {
      id: "a3",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: "rejected",
      toStatus: "submitted",
      actorUserId: null,
      note: "Pending Review",
      createdAt: "2026-09-08T00:00:00.000Z",
    },
  ];

  const start = resolveAmSlaClockStart(
    "sub1",
    "2026-09-01T00:00:00.000Z",
    activities,
  );
  assert.equal(start?.toISOString(), "2026-09-08T00:00:00.000Z");
});

test("isSlaBreachedSubmission respects pending review SLA window", () => {
  const now = new Date("2026-09-10T00:00:00.000Z");
  assert.equal(
    isSlaBreachedSubmission(
      submission({ submissionDate: "2026-09-09T12:00:00.000Z" }),
      now,
    ),
    false,
  );
  assert.equal(
    isSlaBreachedSubmission(
      submission({ submissionDate: "2026-09-05T00:00:00.000Z" }),
      now,
    ),
    true,
  );
});
