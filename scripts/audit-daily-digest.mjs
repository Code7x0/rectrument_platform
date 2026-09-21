/**
 * Compare Super Admin digest metrics to raw submission/job data.
 * Usage: node --env-file=.env.local scripts/audit-daily-digest.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { register } = require("tsx/cjs/api");
register();

const now = new Date();
const { getDigestWindow } = require("../services/email/layout.ts");
const {
  matchesSubmissionStatusGroup,
} = require("../features/submissions/lib/submission-status-buckets.ts");
const {
  inDigestWindow,
  submissionDigestTouchAt,
  countPipelineStageMoves,
  countRolesWorkedInDigestWindow,
  buildAmSlaClockStartMap,
  countSlaBreachesForPrimaryAm,
  filterSubmissionsForActivePartners,
  buildActivePartnerIdSet,
} = require("../services/email/digests/daily-digest-metrics.ts");
const { findSubmissionsSafe } = require("../features/submissions/repositories/submissions.repository.ts");
const { findJobs } = require("../features/jobs/repositories/jobs.repository.ts");
const { findPartners } = require("../features/partners/repositories/partners.repository.ts");
const { getActiveAccountManagerDigestRecipients } = require("../lib/email/recipients.ts");
const { listActivitiesForDigestWindow } = require("../features/workflows/services/activity.service.ts");
const { enrichSubmissionsWithLastActivity } = require("../features/submissions/lib/enrich-submission-activity.ts");

async function main() {
  const { start: windowStart, end } = getDigestWindow(now);
  console.log("=== Digest window ===");
  console.log({ now: now.toISOString(), windowStart: windowStart.toISOString(), end: end.toISOString() });

  const [submissionsRaw, jobs, partners, amRecipients, activities] = await Promise.all([
    findSubmissionsSafe({}),
    findJobs({}),
    findPartners({}),
    getActiveAccountManagerDigestRecipients(),
    listActivitiesForDigestWindow(windowStart, 5000).catch(() => []),
  ]);

  const submissions = await enrichSubmissionsWithLastActivity(submissionsRaw);
  const activePartnerIds = buildActivePartnerIdSet(partners);
  const jobMap = new Map(
    jobs.map((job) => [
      job.id,
      {
        accountManagerId: job.accountManagerId,
        accountManagerIds: job.accountManagerIds ?? [],
        title: job.title,
        clientName: job.clientName,
        priority: job.priority,
      },
    ]),
  );
  const submissionMap = new Map(submissions.map((r) => [r.id, r]));
  const slaClockStarts = buildAmSlaClockStartMap(submissions, activities);
  const activeSubs = filterSubmissionsForActivePartners(submissions, activePartnerIds);

  const snapshot = {
    pending_review: submissions.filter((r) => matchesSubmissionStatusGroup(r, "pending_review")).length,
    internal_screening: submissions.filter((r) => matchesSubmissionStatusGroup(r, "internal_screening")).length,
    being_submitted: submissions.filter((r) => matchesSubmissionStatusGroup(r, "being_submitted")).length,
    interviewing: submissions.filter((r) => matchesSubmissionStatusGroup(r, "interviewing")).length,
    selected: submissions.filter((r) => matchesSubmissionStatusGroup(r, "selected")).length,
  };

  const withUpdatedAt = submissions.filter((r) => r.updatedAt?.trim()).length;
  const touchedInWindow = submissions.filter((r) =>
    inDigestWindow(submissionDigestTouchAt(r), windowStart, now),
  ).length;
  const submissionDateInWindow = submissions.filter((r) =>
    inDigestWindow(r.submissionDate, windowStart, now),
  ).length;

  const freshPendingReview = submissions.filter(
    (r) =>
      matchesSubmissionStatusGroup(r, "pending_review") &&
      (inDigestWindow(r.submissionDate, windowStart, now) ||
        inDigestWindow(submissionDigestTouchAt(r), windowStart, now)),
  ).length;

  const stages = ["internal_screening", "being_submitted", "interviewing", "selected"];
  const moves = {};
  for (const stage of stages) {
    moves[stage] = countPipelineStageMoves(
      activities,
      submissions,
      submissionMap,
      jobMap,
      windowStart,
      now,
      stage,
    );
  }

  const rolesWorked = countRolesWorkedInDigestWindow(
    submissions,
    activities,
    submissionMap,
    windowStart,
    now,
  );

  console.log("\n=== Snapshot (matches email top row) ===");
  console.log(snapshot);
  console.log("\n=== Data quality ===");
  console.log({
    totalSubmissions: submissions.length,
    withUpdatedAt,
    touchedInWindow,
    submissionDateInWindow,
    activityRowsInWindow: activities.filter((a) =>
      inDigestWindow(a.createdAt, windowStart, now),
    ).length,
    jobsWithPrimaryAm: jobs.filter((j) => j.accountManagerId).length,
    jobsTotal: jobs.length,
  });

  console.log("\n=== 24h digest metrics (email second row) ===");
  console.log({
    rolesWorked,
    freshPendingReview,
    ...moves,
  });

  console.log("\n=== SLA breaches by AM (active partners only) ===");
  for (const am of amRecipients) {
    const count = countSlaBreachesForPrimaryAm(
      submissions,
      jobMap,
      am.accountManagerId,
      now,
      slaClockStarts,
      activePartnerIds,
    );
    if (count > 0) {
      console.log(`  ${am.fullName}: ${count}`);
    }
  }

  const sampleTouched = submissions
    .filter((r) => inDigestWindow(submissionDigestTouchAt(r), windowStart, now))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      status: r.airtableStatus ?? r.status,
      submissionDate: r.submissionDate,
      updatedAt: r.updatedAt,
      touch: submissionDigestTouchAt(r),
    }));
  console.log("\n=== Sample submissions touched in window ===");
  console.log(sampleTouched);

}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
