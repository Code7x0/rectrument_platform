import assert from "node:assert/strict";
import test from "node:test";

import type { Submission } from "@/features/submissions/types";

import type { Activity } from "@/features/workflows/types";

import {
  activityMovedToPipelineStage,
  countActivityTransitions,
  countPipelineStageMoves,
  parseDigestDate,
  submissionDigestTouchAt,
  countSlaBreachesForPrimaryAm,
  filterSubmissionsForActivePartners,
  isSlaBreachedSubmission,
  resolveAmSlaClockStart,
  submissionAdvancedToBeingSubmittedSameIstDay,
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

test("submissionDigestTouchAt prefers Airtable updatedAt over stale lastActivityAt", () => {
  const row = submission({
    submissionDate: "2026-01-01T00:00:00.000Z",
    lastActivityAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
  });
  assert.equal(
    submissionDigestTouchAt(row),
    "2026-09-20T08:00:00.000Z",
  );
});

test("countPipelineStageMoves counts rows without job AM for org-wide digest", () => {
  const windowStart = new Date("2026-09-20T01:30:00.000Z");
  const now = new Date("2026-09-21T01:30:00.000Z");
  const jobMap = new Map<string, JobAmLookup>([
    ["job1", { accountManagerId: null, accountManagerIds: [] }],
  ]);
  const row = submission({
    id: "sub1",
    jobId: "job1",
    status: "client_review",
    airtableStatus: "Being Submitted to Client",
    updatedAt: "2026-09-20T10:00:00.000Z",
  });
  const submissionMap = new Map([[row.id, row]]);
  assert.equal(
    countPipelineStageMoves(
      [],
      [row],
      submissionMap,
      jobMap,
      windowStart,
      now,
      "being_submitted",
    ),
    1,
  );
});

test("parseDigestDate treats date-only Submission Date as inside a 24h window", () => {
  const day = parseDigestDate("2026-09-19");
  assert.ok(day);
  const windowStart = new Date("2026-09-18T12:00:00.000Z");
  const now = new Date("2026-09-19T18:00:00.000Z");
  assert.equal(day! >= windowStart && day! <= now, true);
});

test("countPipelineStageMoves uses live Airtable row when activities are empty", () => {
  const windowStart = new Date("2026-09-18T01:30:00.000Z");
  const now = new Date("2026-09-19T01:30:00.000Z");
  const jobMap = new Map<string, JobAmLookup>([
    ["job1", { accountManagerId: "am1", accountManagerIds: ["am1"] }],
  ]);
  const row = submission({
    id: "sub1",
    jobId: "job1",
    status: "internal_review",
    airtableStatus: "Internal Screening in Progress",
    updatedAt: "2026-09-18T10:00:00.000Z",
  });
  const submissionMap = new Map([[row.id, row]]);

  assert.equal(
    countPipelineStageMoves(
      [],
      [row],
      submissionMap,
      jobMap,
      windowStart,
      now,
      "internal_screening",
    ),
    1,
  );
});

test("internal screening digest excludes same-day advance to Being Submitted to Client", () => {
  const windowStart = new Date("2026-09-18T01:30:00.000Z");
  const now = new Date("2026-09-19T01:30:00.000Z");
  const jobMap = new Map<string, JobAmLookup>([
    ["job1", { accountManagerId: "am1", accountManagerIds: ["am1"] }],
  ]);
  const submissionMap = new Map([
    [
      "sub1",
      submission({
        id: "sub1",
        jobId: "job1",
        status: "client_review",
        airtableStatus: "Being Submitted to Client",
      }),
    ],
  ]);
  const activities: Activity[] = [
    {
      id: "a1",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: "submitted",
      toStatus: "internal_review",
      actorUserId: null,
      note: "Internal Screening in Progress",
      createdAt: "2026-09-18T06:00:00.000Z",
    },
    {
      id: "a2",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: "internal_review",
      toStatus: "client_review",
      actorUserId: null,
      note: "Being Submitted to Client",
      createdAt: "2026-09-18T10:00:00.000Z",
    },
  ];

  assert.equal(
    countActivityTransitions(
      activities,
      submissionMap,
      jobMap,
      windowStart,
      now,
      "internal_screening",
    ),
    0,
  );
  assert.equal(
    countActivityTransitions(
      activities,
      submissionMap,
      jobMap,
      windowStart,
      now,
      "being_submitted",
    ),
    1,
  );
});

test("internal screening digest counts when candidate stays in screening same window", () => {
  const windowStart = new Date("2026-09-18T01:30:00.000Z");
  const now = new Date("2026-09-19T01:30:00.000Z");
  const jobMap = new Map<string, JobAmLookup>([
    ["job1", { accountManagerId: "am1", accountManagerIds: ["am1"] }],
  ]);
  const submissionMap = new Map([
    [
      "sub1",
      submission({
        id: "sub1",
        jobId: "job1",
        status: "internal_review",
        airtableStatus: "Internal Screening in Progress",
      }),
    ],
  ]);
  const activities: Activity[] = [
    {
      id: "a1",
      entityType: "submission",
      entityId: "sub1",
      action: "status_change",
      fromStatus: "submitted",
      toStatus: "internal_review",
      actorUserId: null,
      note: "Internal Screening in Progress",
      createdAt: "2026-09-18T06:00:00.000Z",
    },
  ];

  assert.equal(
    countActivityTransitions(
      activities,
      submissionMap,
      jobMap,
      windowStart,
      now,
      "internal_screening",
    ),
    1,
  );
});

test("Hold transition does not count as internal screening in digest", () => {
  const activity: Activity = {
    id: "a1",
    entityType: "submission",
    entityId: "sub1",
    action: "status_change",
    fromStatus: "submitted",
    toStatus: "internal_review",
    actorUserId: null,
    note: "Hold",
    createdAt: "2026-09-18T06:00:00.000Z",
  };
  assert.equal(activityMovedToPipelineStage(activity, "internal_screening"), false);
  assert.equal(
    submissionAdvancedToBeingSubmittedSameIstDay(
      [],
      "sub1",
      activity.createdAt!,
      new Date("2026-09-18T00:00:00.000Z"),
      new Date("2026-09-19T00:00:00.000Z"),
    ),
    false,
  );
});

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

test("countSlaBreachesForPrimaryAm only counts active partner submissions", () => {
  const jobMap = new Map<string, JobAmLookup>([
    [
      "job1",
      {
        accountManagerId: "am-primary",
        accountManagerIds: ["am-primary"],
      },
    ],
  ]);
  const now = new Date("2026-09-10T00:00:00.000Z");
  const rows = [
    submission({ partnerId: "partner-active" }),
    submission({ id: "sub2", partnerId: "partner-inactive" }),
  ];
  const activePartnerIds = new Set(["partner-active"]);

  assert.equal(
    countSlaBreachesForPrimaryAm(
      rows,
      jobMap,
      "am-primary",
      now,
      undefined,
      activePartnerIds,
    ),
    1,
  );
  assert.equal(
    filterSubmissionsForActivePartners(rows, activePartnerIds).length,
    1,
  );
});
