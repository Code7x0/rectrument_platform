import { listAllocations } from "@/features/allocations/services";
import { listPartnerQueries } from "@/features/feedback/services/partner-queries.service";
import { listJobs } from "@/features/jobs/services";
import { listPartners } from "@/features/partners/services";
import {
  matchesSubmissionStatusGroup,
  submissionExactStatusLabel,
} from "@/features/submissions/lib/submission-status-buckets";
import { listSubmissions } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import {
  listActivitiesForDigestWindow,
} from "@/features/workflows/services/activity.service";
import { isActivitiesStorageAvailable } from "@/features/workflows/repositories/activities.repository";
import { enrichSubmissionsWithLastActivity } from "@/features/submissions/lib/enrich-submission-activity";
import type { Activity } from "@/features/workflows/types";
import {
  fanOutEmail,
  getActiveAccountManagerDigestRecipients,
  getAdminNotificationEmails,
  getSuperAdminNotificationEmails,
} from "@/lib/email/recipients";
import {
  formatCountLine,
  formatDigestDayHeading,
  formatOvatoDate,
  formatTable,
  getDigestWindow,
} from "@/services/email/layout";
import { sendEmailSafe } from "@/services/email";
import { listUsers } from "@/services/users";

import {
  activityMovedToPipelineStage,
  buildAmSlaClockStartMap,
  countPipelineStageMoves,
  countPipelineStageSnapshot,
  countRolesWorkedInDigestWindow,
  countRolesWorkedPipelineSnapshot,
  shouldUsePipelineSnapshotDigest,
  countSlaBreachesForPrimaryAm,
  filterSubmissionsForActivePartners,
  formatDigestStatusLabel,
  inDigestWindow,
  isSlaBreachedSubmission,
  parseDigestDate,
  slaBreachDays,
  submissionDigestTouchAt,
  submissionOwnedByAm,
  submissionPrimaryAmId,
  type JobAmLookup,
} from "./daily-digest-metrics";
import type { Allocation } from "@/features/allocations/types";
import {
  buildActivePartnerIdSet,
  isPartnerEligibleForDigest,
  PARTNER_DIGEST_NEW_ROLES_COLUMN,
  PARTNER_DIGEST_SNAPSHOT_COLUMNS,
} from "@/services/email/digests/partner-digest-copy";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function rollingWindowStart(now: Date): Date {
  return getDigestWindow(now).start;
}

function buildRecommendedByClient(
  rows: Submission[],
): string {
  if (rows.length === 0) {
    return "Profiles Recommended:\nNo new profiles added in the last 24 hours.";
  }

  const byClient = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const client = row.clientName?.trim() || "Client";
    const designation = row.jobTitle?.trim() || "Role";
    if (!byClient.has(client)) {
      byClient.set(client, new Map());
    }
    const jobs = byClient.get(client)!;
    jobs.set(designation, (jobs.get(designation) ?? 0) + 1);
  }

  const lines = ["Profiles Recommended:"];
  for (const [client, jobs] of byClient) {
    lines.push("", client);
    lines.push(
      formatTable(
        ["Designation", "Profiles"],
        [...jobs.entries()].map(([designation, count]) => [
          designation,
          String(count),
        ]),
      ),
    );
  }
  return lines.join("\n");
}

function buildSlaSection(
  rows: Submission[],
  now: Date,
  jobMap: Map<string, JobAmLookup>,
  slaClockStarts: Map<string, Date>,
  options: { includeJob?: boolean } = {},
): string {
  const breached = rows.filter((row) =>
    isSlaBreachedSubmission(row, now, jobMap, slaClockStarts.get(row.id)),
  );

  if (breached.length === 0) {
    return "Account Manager SLA alert\nNo profiles missing SLA.";
  }

  const lines = [
    "Account Manager SLA alert",
    "Candidates pending AM review beyond SLA (active partner submissions only).",
  ];
  const byClient = new Map<string, Submission[]>();
  for (const row of breached) {
    const client = row.clientName?.trim() || "Client";
    if (!byClient.has(client)) {
      byClient.set(client, []);
    }
    byClient.get(client)!.push(row);
  }

  const headers = [
    "Role",
    ...(options.includeJob ? ["Job"] : []),
    "Candidate Name",
    "Date Recommended",
    "SLA Breach (In Days)",
    "Status",
  ];

  for (const [client, clientRows] of byClient) {
    lines.push("", `Client Name: ${client}`);
    lines.push(
      formatTable(
        headers,
        clientRows.map((row) => {
          const submitted = parseDigestDate(row.submissionDate);
          const dateLabel = submitted
            ? submitted.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })
            : "—";
          const roleCells = [
            row.jobTitle ?? "Role",
            ...(options.includeJob
              ? [row.jobCode?.trim() || row.jobTitle?.trim() || "—"]
              : []),
            row.candidateName ?? "Candidate",
            dateLabel,
            String(slaBreachDays(row, now, jobMap, slaClockStarts.get(row.id))),
            formatDigestStatusLabel(row),
          ];
          return roleCells;
        }),
      ),
    );
  }

  return lines.join("\n");
}

function listPartnerNewAccountNames(
  partnerId: string,
  allocations: Allocation[],
  jobs: Awaited<ReturnType<typeof listJobs>>,
  windowStart: Date,
  now: Date,
): string[] {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const clientNames = new Set<string>();

  for (const allocation of allocations) {
    if (allocation.partnerId !== partnerId) {
      continue;
    }
    if (
      allocation.status === "archived" ||
      allocation.status === "cancelled"
    ) {
      continue;
    }
    if (!inDigestWindow(allocation.assignedDate, windowStart, now)) {
      continue;
    }
    const job = jobById.get(allocation.jobId);
    const label =
      job?.clientName?.trim() || job?.clientCode?.trim() || job?.title?.trim();
    if (label) {
      clientNames.add(label);
    }
  }

  return [...clientNames];
}

function buildPartnerActivationsTable(
  accountNames: string[],
  newRoleTitles: string[],
): string {
  return formatTable(
    [
      "New Accounts Activated",
      PARTNER_DIGEST_NEW_ROLES_COLUMN,
    ],
    [
      [
        accountNames.length > 0 ? accountNames.join(" / ") : "—",
        newRoleTitles.length > 0 ? newRoleTitles.join(" / ") : "—",
      ],
    ],
  );
}

function countSecondLevelReviewsInWindow(
  owned: Submission[],
  activities: Activity[],
  windowStart: Date,
  now: Date,
): number {
  const ownedIds = new Set(owned.map((row) => row.id));
  const seen = new Set<string>();
  let count = 0;

  for (const activity of activities) {
    if (activity.entityType !== "submission") {
      continue;
    }
    if (!ownedIds.has(activity.entityId)) {
      continue;
    }
    if (activity.toStatus !== "second_level_review") {
      continue;
    }
    if (!inDigestWindow(activity.createdAt, windowStart, now)) {
      continue;
    }
    const key = `${activity.entityId}:${activity.createdAt ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    count += 1;
  }

  return count;
}

/** Super Admin digest — per-AM breach totals (not partners). */
const AM_SLA_BREACH_SECTION_TITLE = "Account Manager SLA Breach Count";
const AM_SLA_BREACH_SECTION_NOTE =
  "Each column is an Account Manager. Counts include only candidates from active talent partners.";

function buildAmSlaBreachCountSection(
  amRecipients: Awaited<ReturnType<typeof getActiveAccountManagerDigestRecipients>>,
  submissions: Submission[],
  jobMap: Map<string, JobAmLookup>,
  now: Date,
  slaClockStarts: Map<string, Date>,
): string {
  const amRows = amRecipients
    .map((am) => {
      const amId = am.accountManagerId;
      if (!amId) {
        return null;
      }
      return {
        name: am.fullName?.trim() || am.email || amId,
        count: countSlaBreachesForPrimaryAm(
          submissions,
          jobMap,
          amId,
          now,
          slaClockStarts,
        ),
      };
    })
    .filter((row): row is { name: string; count: number } => row != null);

  if (amRows.length === 0) {
    return `${AM_SLA_BREACH_SECTION_TITLE}\nNo active account managers.`;
  }

  return [
    AM_SLA_BREACH_SECTION_TITLE,
    AM_SLA_BREACH_SECTION_NOTE,
    formatTable(
      amRows.map((row) => row.name),
      [amRows.map((row) => String(row.count))],
    ),
  ].join("\n");
}

function buildSuperAdminDigest(
  submissions: Submission[],
  jobs: Awaited<ReturnType<typeof listJobs>>,
  amRecipients: Awaited<ReturnType<typeof getActiveAccountManagerDigestRecipients>>,
  activities: Activity[],
  windowStart: Date,
  now: Date,
  _digestDate: string,
  slaClockStarts: Map<string, Date>,
  activePartnerIds: Set<string>,
  activitiesStorageConfigured: boolean,
): string {
  const jobMap = new Map<string, JobAmLookup>(
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
  const submissionMap = new Map(submissions.map((row) => [row.id, row]));

  const pendingReview = submissions.filter((row) =>
    matchesSubmissionStatusGroup(row, "pending_review"),
  ).length;
  const beingSubmitted = submissions.filter((row) =>
    matchesSubmissionStatusGroup(row, "being_submitted"),
  ).length;
  const interviewing = submissions.filter((row) =>
    matchesSubmissionStatusGroup(row, "interviewing"),
  ).length;
  const selects = submissions.filter((row) =>
    matchesSubmissionStatusGroup(row, "selected"),
  ).length;

  const usePipelineSnapshot = shouldUsePipelineSnapshotDigest(
    submissions,
    activities,
    windowStart,
    now,
    { activitiesStorageConfigured },
  );

  const freshPendingReview = usePipelineSnapshot
    ? countPipelineStageSnapshot(submissions, "pending_review")
    : submissions.filter(
        (row) =>
          matchesSubmissionStatusGroup(row, "pending_review") &&
          (inDigestWindow(row.submissionDate, windowStart, now) ||
            inDigestWindow(submissionDigestTouchAt(row), windowStart, now)),
      ).length;

  const rolesWorked = usePipelineSnapshot
    ? countRolesWorkedPipelineSnapshot(submissions)
    : countRolesWorkedInDigestWindow(
        submissions,
        activities,
        submissionMap,
        windowStart,
        now,
      );

  const movedInternal = usePipelineSnapshot
    ? countPipelineStageSnapshot(submissions, "internal_screening")
    : countPipelineStageMoves(
        activities,
        submissions,
        submissionMap,
        jobMap,
        windowStart,
        now,
        "internal_screening",
      );
  const movedSubmitted = usePipelineSnapshot
    ? countPipelineStageSnapshot(submissions, "being_submitted")
    : countPipelineStageMoves(
        activities,
        submissions,
        submissionMap,
        jobMap,
        windowStart,
        now,
        "being_submitted",
      );
  const movedInterviewing = usePipelineSnapshot
    ? countPipelineStageSnapshot(submissions, "interviewing")
    : countPipelineStageMoves(
        activities,
        submissions,
        submissionMap,
        jobMap,
        windowStart,
        now,
        "interviewing",
      );
  const movedSelect = usePipelineSnapshot
    ? countPipelineStageSnapshot(submissions, "selected")
    : countPipelineStageMoves(
        activities,
        submissions,
        submissionMap,
        jobMap,
        windowStart,
        now,
        "selected",
      );

  const activePartnerSubmissions = filterSubmissionsForActivePartners(
    submissions,
    activePartnerIds,
  );

  const uniqueBreachedSubmissions = activePartnerSubmissions.filter((row) =>
    isSlaBreachedSubmission(row, now, jobMap, slaClockStarts.get(row.id)),
  );

  const selectDetails = buildSelectProgressionSection(
    activities,
    submissionMap,
    jobMap,
    windowStart,
    now,
  );

  return [
    formatTable(
      [
        "Pending Review",
        "Being Submitted to Client",
        "Interviewing",
        "Selects",
      ],
      [[String(pendingReview), String(beingSubmitted), String(interviewing), String(selects)]],
    ),
    "",
    formatDigestDayHeading(now),
    usePipelineSnapshot
      ? "Current pipeline workload (live Airtable — matches Command Center)."
      : "Last 24 hours (activity since prior digest — not the pipeline snapshot above).",
    formatTable(
      usePipelineSnapshot
        ? [
            "No of Roles Worked",
            'Candidates in "Pending Review"',
            "Candidates in Internal Screening Pending",
            'Candidates in "Being Submitted to Client"',
            'Candidates in "Interviewing"',
            'Candidates in "Select"',
          ]
        : [
            "No of Roles Worked",
            'Candidates sourced by Partners "Pending Review"',
            "Candidates moved to Internal Screening Pending",
            'Candidates moved to "Being Submitted to Client"',
            'Candidates moved to "Interviewing"',
            'Candidates Moving to "Select"',
          ],
      [
        [
          String(rolesWorked),
          String(freshPendingReview),
          String(movedInternal),
          String(movedSubmitted),
          String(movedInterviewing),
          String(movedSelect),
        ],
      ],
    ),
    ...(selectDetails ? ["", selectDetails] : []),
    "",
    buildAmSlaBreachCountSection(
      amRecipients,
      activePartnerSubmissions,
      jobMap,
      now,
      slaClockStarts,
    ),
    "",
    buildSlaSection(uniqueBreachedSubmissions, now, jobMap, slaClockStarts),
  ].join("\n");
}

function buildSelectProgressionSection(
  activities: Activity[],
  submissionMap: Map<string, Submission>,
  jobMap: Map<string, JobAmLookup>,
  windowStart: Date,
  now: Date,
): string {
  const seen = new Set<string>();
  const rows: string[][] = [];

  for (const activity of activities) {
    if (activity.entityType !== "submission") {
      continue;
    }
    if (!inDigestWindow(activity.createdAt, windowStart, now)) {
      continue;
    }
    if (!activityMovedToPipelineStage(activity, "selected")) {
      continue;
    }
    const dedupeKey = `${activity.entityId}:${activity.createdAt ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const submission = submissionMap.get(activity.entityId);
    if (!submission) {
      continue;
    }
    const job = jobMap.get(submission.jobId);
    rows.push([
      submission.candidateName?.trim() || "Candidate",
      submission.clientName?.trim() || job?.clientName?.trim() || "Client",
      submission.jobTitle?.trim() || job?.title?.trim() || "Role",
    ]);
  }

  if (rows.length === 0) {
    return "";
  }

  return [
    'Candidates Moving to "Select" (details)',
    formatTable(["Name", "Client Name", "Job"], rows),
  ].join("\n");
}

function buildPartnerSnapshot(
  rows: Submission[],
  allocatedJobIds: Set<string>,
  jobs: Awaited<ReturnType<typeof listJobs>>,
): string {
  const count = (group: Parameters<typeof matchesSubmissionStatusGroup>[1]) =>
    rows.filter((row) => matchesSubmissionStatusGroup(row, group)).length;

  const superHighJobs = jobs.filter(
    (job) =>
      allocatedJobIds.has(job.id) && job.priority === "urgent" && job.status === "open",
  ).length;

  return formatTable(
    [...PARTNER_DIGEST_SNAPSHOT_COLUMNS],
    [
      [
        String(allocatedJobIds.size),
        String(superHighJobs),
        String(count("pending_review")),
        String(count("internal_screening")),
        String(count("being_submitted")),
        String(count("interviewing")),
      ],
    ],
  );
}

function buildPartnerJobChanges(
  activities: Activity[],
  allocatedJobIds: Set<string>,
  jobs: Awaited<ReturnType<typeof listJobs>>,
  windowStart: Date,
  now: Date,
): string {
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const rows = activities
    .filter(
      (activity) =>
        activity.entityType === "job" &&
        allocatedJobIds.has(activity.entityId) &&
        inDigestWindow(activity.createdAt, windowStart, now),
    )
    .slice(0, 12)
    .map((activity) => {
      const job = jobById.get(activity.entityId);
      return [
        job?.jobCode?.trim() || activity.entityId.slice(0, 8),
        activity.note?.trim() || "Status",
        activity.toStatus?.trim() || activity.fromStatus?.trim() || "Updated",
      ];
    });

  if (rows.length === 0) {
    return [
      "Job Changes",
      formatTable(
        ["Jobs ID", "Field Updated", "Present Value"],
        [["—", "—", "No job changes in the last 24 hours."]],
      ),
    ].join("\n");
  }

  return [
    "Job Changes",
    formatTable(["Jobs ID", "Field Updated", "Present Value"], rows),
  ].join("\n");
}

function buildPartnerCandidateUpdates(
  rows: Submission[],
  activities: Activity[],
  windowStart: Date,
  now: Date,
): string {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const tableRows: string[][] = [];
  const seen = new Set<string>();

  for (const activity of activities) {
    if (activity.entityType !== "submission") {
      continue;
    }
    if (!inDigestWindow(activity.createdAt, windowStart, now)) {
      continue;
    }
    const submission = rowById.get(activity.entityId);
    if (!submission) {
      continue;
    }

    const dedupeKey = `${activity.entityId}:${activity.createdAt ?? ""}:${activity.note ?? ""}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    let fieldUpdated = "Submission Status";
    let presentValue = submissionExactStatusLabel(submission);

    if (activity.note === "interview_stage_updated") {
      fieldUpdated = "Interview Status";
      presentValue =
        submission.interviewStage?.trim() ||
        activity.toStatus?.trim() ||
        "—";
    } else if (activity.action === "status_change" && activity.toStatus) {
      presentValue = submissionExactStatusLabel(submission);
    }

    tableRows.push([
      submission.submissionCode?.trim() || submission.id.slice(0, 8),
      fieldUpdated,
      presentValue,
      submission.internalFeedback?.trim() || "—",
    ]);
  }

  for (const submission of rows) {
    if (!inDigestWindow(submission.submissionDate, windowStart, now)) {
      continue;
    }
    const dedupeKey = `new:${submission.id}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    tableRows.push([
      submission.submissionCode?.trim() || submission.id.slice(0, 8),
      "Submission Status",
      submissionExactStatusLabel(submission),
      submission.internalFeedback?.trim() || "—",
    ]);
  }

  tableRows.sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));

  if (tableRows.length === 0) {
    return [
      "Candidate Updates:",
      formatTable(
        [
          "Candidate ID",
          "Field Updated",
          "Present Value",
          "Internal Feedback",
        ],
        [["—", "—", "No candidate updates in the last 24 hours.", "—"]],
      ),
    ].join("\n");
  }

  return [
    "Candidate Updates:",
    formatTable(
      [
        "Candidate ID",
        "Field Updated",
        "Present Value",
        "Internal Feedback",
      ],
      tableRows.slice(0, 20),
    ),
  ].join("\n");
}

export interface DailyDigestResult {
  attempted: number;
  sent: number;
  errors: string[];
}

const DIGEST_EMAIL_BATCH_SIZE = 8;

async function runDigestEmailBatch<T, R>(
  items: readonly T[],
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += DIGEST_EMAIL_BATCH_SIZE) {
    const slice = items.slice(i, i + DIGEST_EMAIL_BATCH_SIZE);
    const batchResults = await Promise.all(slice.map((item) => worker(item)));
    results.push(...batchResults);
  }
  return results;
}

export async function sendDailyDigests(now = new Date()): Promise<DailyDigestResult> {
  const windowStart = rollingWindowStart(now);
  const digestDate = formatOvatoDate(now);
  console.info("[digest] sendDailyDigests start", {
    digestDate,
    windowStart: windowStart.toISOString(),
    now: now.toISOString(),
  });

  const [
    submissionsRaw,
    jobs,
    queries,
    amRecipients,
    partnerUsers,
    partners,
    allAllocations,
    activities,
  ] = await Promise.all([
    listSubmissions({ includePartnerIdentity: true }),
    listJobs({ includeArchived: false }),
    listPartnerQueries(),
    getActiveAccountManagerDigestRecipients(),
    listUsers({ role: "partner", status: "active" }),
    listPartners(),
    listAllocations({ includePartnerIdentity: false }),
    listActivitiesForDigestWindow(windowStart, 5000).catch(
      () => [] as Activity[],
    ),
  ]);

  const submissions = await enrichSubmissionsWithLastActivity(submissionsRaw);

  const activePartnerIds = buildActivePartnerIdSet(partners);

  const activeAllocationsByPartner = new Map<string, Set<string>>();
  for (const allocation of allAllocations) {
    if (
      allocation.status === "archived" ||
      allocation.status === "cancelled"
    ) {
      continue;
    }
    const partnerKey = allocation.partnerId?.trim();
    if (!partnerKey || !isPartnerEligibleForDigest(partnerKey, activePartnerIds)) {
      continue;
    }
    const jobIds = activeAllocationsByPartner.get(partnerKey) ?? new Set();
    jobIds.add(allocation.jobId);
    activeAllocationsByPartner.set(partnerKey, jobIds);
  }

  const jobMap = new Map<string, JobAmLookup>(
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
  const slaClockStarts = buildAmSlaClockStartMap(submissions, activities);

  const result: DailyDigestResult = { attempted: 0, sent: 0, errors: [] };
  const baseUrl = appBaseUrl();

  for (const am of amRecipients) {
    const amId = am.accountManagerId;
    if (!am.email?.trim() || !amId) {
      result.errors.push(
        `AM digest skipped: missing email or id for ${am.fullName}`,
      );
      continue;
    }

    const owned = submissions.filter((row) =>
      submissionOwnedByAm(row, jobMap, amId),
    );
    const newInWindow = owned.filter((row) =>
      inDigestWindow(row.submissionDate, windowStart, now),
    );
    const pendingAction = owned.filter(
      (row) =>
        matchesSubmissionStatusGroup(row, "pending_review") ||
        matchesSubmissionStatusGroup(row, "internal_screening"),
    );
    const slaMissing = submissions.filter(
      (row) =>
        submissionPrimaryAmId(row, jobMap) === amId &&
        isSlaBreachedSubmission(
          row,
          now,
          jobMap,
          slaClockStarts.get(row.id),
        ),
    );
    const secondLevelReviews = countSecondLevelReviewsInWindow(
      owned,
      activities,
      windowStart,
      now,
    );
    const openQueries = queries.filter((query) => {
      if (query.status !== "open") {
        return false;
      }
      if (!inDigestWindow(query.submittedAt, windowStart, now)) {
        return false;
      }
      if (query.accountManagerId && query.accountManagerId !== amId) {
        return false;
      }
      return true;
    });

    const digestBody = [
      formatCountLine(
        "New Profiles Added for your action",
        newInWindow.length,
      ),
      formatCountLine("Profiles Pending your action", pendingAction.length),
      formatCountLine("Profiles Missing SLAs", slaMissing.length),
      formatCountLine("2nd Level Review Request raised", secondLevelReviews),
      "",
      buildRecommendedByClient(newInWindow),
      "",
      buildSlaSection(owned, now, jobMap, slaClockStarts),
      "",
      "PARTNER QUESTIONS (last 24 hours)",
      openQueries.length === 0
        ? "No new partner questions."
        : openQueries
            .map(
              (query) =>
                `  • ${query.partnerCode}: ${query.message.slice(0, 120)}${query.message.length > 120 ? "…" : ""}`,
            )
            .join("\n"),
    ].join("\n");

    result.attempted += 1;
    const sendResult = await sendEmailSafe({
      to: am.email,
      template: "daily_digest_am",
      data: {
        name: am.fullName,
        digestBody,
        digestDate,
        dashboardUrl: `${baseUrl}/account-manager`,
      },
    });
    if (sendResult) {
      result.sent += 1;
    } else {
      result.errors.push(`AM digest failed for ${am.email}`);
    }
  }

  const partnerDigestTargets = partnerUsers.filter((partner) => {
    const partnerId = partner.partnerId?.trim();
    if (!partner.email?.trim() || !partnerId) {
      return false;
    }
    return isPartnerEligibleForDigest(partnerId, activePartnerIds);
  });

  const partnerOutcomes = await runDigestEmailBatch(partnerDigestTargets, async (partner) => {
    const partnerId = partner.partnerId!.trim();
    const owned = submissions.filter((row) => row.partnerId === partnerId);
    const allocatedJobIds =
      activeAllocationsByPartner.get(partnerId) ?? new Set<string>();

    const newRoleTitles = jobs
      .filter((job) => {
        const posted = parseDigestDate(job.postedDate ?? job.createdAt);
        return (
          job.status === "open" &&
          posted != null &&
          inDigestWindow(job.postedDate ?? job.createdAt, windowStart, now)
        );
      })
      .map((job) => job.title)
      .filter(Boolean);

    const newAccountNames = listPartnerNewAccountNames(
      partnerId,
      allAllocations,
      jobs,
      windowStart,
      now,
    );

    const digestBody = [
      formatDigestDayHeading(now),
      "",
      buildPartnerActivationsTable(newAccountNames, newRoleTitles),
      "",
      buildPartnerSnapshot(owned, allocatedJobIds, jobs),
      "",
      buildPartnerJobChanges(activities, allocatedJobIds, jobs, windowStart, now),
      "",
      buildPartnerCandidateUpdates(owned, activities, windowStart, now),
    ].join("\n");

    const sendResult = await sendEmailSafe({
      to: partner.email!,
      template: "daily_digest_partner",
      data: {
        name: partner.fullName,
        digestBody,
        digestDate,
        dashboardUrl: `${baseUrl}/partner`,
      },
    });
    return sendResult
      ? { sent: true as const }
      : {
          sent: false as const,
          error: `Partner digest failed for ${partner.email}`,
        };
  });

  for (const outcome of partnerOutcomes) {
    result.attempted += 1;
    if (outcome.sent) {
      result.sent += 1;
    } else if (outcome.error) {
      result.errors.push(outcome.error);
    }
  }

  const adminRecipients = await getSuperAdminNotificationEmails();
  const fallbackAdmins = adminRecipients.length
    ? adminRecipients
    : await getAdminNotificationEmails();

  if (fallbackAdmins.length > 0) {
    const digestBody = buildSuperAdminDigest(
      submissions,
      jobs,
      amRecipients,
      activities,
      windowStart,
      now,
      digestDate,
      slaClockStarts,
      activePartnerIds,
      isActivitiesStorageAvailable(),
    );

    const adminResult = await fanOutEmail(fallbackAdmins, (to) =>
      sendEmailSafe({
        to,
        template: "daily_digest_admin",
        data: {
          name: "Chief",
          digestBody,
          digestDate,
          dashboardUrl: `${baseUrl}/super-admin`,
        },
      }),
    );
    result.attempted += adminResult.attempted;
    result.sent += adminResult.sent;
  }

  console.info("[digest] sendDailyDigests done", result);
  return result;
}
