import { listAllocations } from "@/features/allocations/services";
import { listPartnerQueries } from "@/features/feedback/services/partner-queries.service";
import { listJobs } from "@/features/jobs/services";
import {
  matchesSubmissionStatusGroup,
  submissionExactStatusLabel,
} from "@/features/submissions/lib/submission-status-buckets";
import { listSubmissions } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import { listActivities } from "@/features/workflows/services/activity.service";
import type { Activity } from "@/features/workflows/types";
import {
  fanOutEmail,
  getActiveAccountManagerDigestRecipients,
  getAdminNotificationEmails,
  getSuperAdminNotificationEmails,
} from "@/lib/email/recipients";
import {
  formatCountLine,
  formatOvatoDate,
  formatTable,
  getDigestWindow,
} from "@/services/email/layout";
import { sendEmailSafe } from "@/services/email";
import { listUsers } from "@/services/users";

import {
  buildAmSlaClockStartMap,
  countActivityTransitions,
  countSlaBreachesForPrimaryAm,
  formatDigestStatusLabel,
  inDigestWindow,
  isSlaBreachedSubmission,
  parseDigestDate,
  slaBreachDays,
  submissionOwnedByAm,
  submissionPrimaryAmId,
  type JobAmLookup,
} from "./daily-digest-metrics";
import type { Allocation } from "@/features/allocations/types";

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
    return "SLA alert\nNo profiles missing SLA.";
  }

  const lines = ["SLA alert"];
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

function buildPartnerNewAccountsSection(
  partnerId: string,
  allocations: Allocation[],
  jobs: Awaited<ReturnType<typeof listJobs>>,
  windowStart: Date,
  now: Date,
): string {
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

  if (clientNames.size === 0) {
    return "No new account allocations in the last 24 hours.";
  }

  return [...clientNames].map((name) => `  • ${name}`).join("\n");
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

function buildSuperAdminDigest(
  submissions: Submission[],
  jobs: Awaited<ReturnType<typeof listJobs>>,
  amRecipients: Awaited<ReturnType<typeof getActiveAccountManagerDigestRecipients>>,
  activities: Activity[],
  windowStart: Date,
  now: Date,
  digestDate: string,
  slaClockStarts: Map<string, Date>,
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

  const freshInWindow = submissions.filter((row) =>
    inDigestWindow(row.submissionDate, windowStart, now),
  );
  const freshProfiles = freshInWindow.length;
  const rolesWithProfiles = new Set(
    freshInWindow.map((row) => row.jobId).filter(Boolean),
  ).size;

  const rolesWorked = new Set<string>();
  for (const row of freshInWindow) {
    if (row.jobId) {
      rolesWorked.add(row.jobId);
    }
  }
  for (const activity of activities) {
    if (activity.entityType !== "submission") {
      continue;
    }
    if (!inDigestWindow(activity.createdAt, windowStart, now)) {
      continue;
    }
    const submission = submissionMap.get(activity.entityId);
    if (submission?.jobId) {
      rolesWorked.add(submission.jobId);
    }
  }

  const pendingReviewSourced = freshInWindow.filter((row) =>
    matchesSubmissionStatusGroup(row, "pending_review"),
  ).length;

  const movedInternal = countActivityTransitions(
    activities,
    submissionMap,
    jobMap,
    windowStart,
    now,
    "internal_screening",
  );
  const movedSubmitted = countActivityTransitions(
    activities,
    submissionMap,
    jobMap,
    windowStart,
    now,
    "being_submitted",
  );
  const movedInterviewing = countActivityTransitions(
    activities,
    submissionMap,
    jobMap,
    windowStart,
    now,
    "interviewing",
  );
  const movedSelect = countActivityTransitions(
    activities,
    submissionMap,
    jobMap,
    windowStart,
    now,
    "selected",
  );

  const amSlaCounts = new Map<string, number>();
  for (const am of amRecipients) {
    const amId = am.accountManagerId;
    if (!amId) {
      continue;
    }
    const label = am.fullName?.trim() || am.email || amId;
    amSlaCounts.set(
      label,
      countSlaBreachesForPrimaryAm(
        submissions,
        jobMap,
        amId,
        now,
        slaClockStarts,
      ),
    );
  }

  const amNames = [...amSlaCounts.keys()];
  const amCounts = [...amSlaCounts.values()];

  const uniqueBreachedSubmissions = submissions.filter((row) =>
    isSlaBreachedSubmission(row, now, jobMap, slaClockStarts.get(row.id)),
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
    digestDate,
    "Partner activity (last 24 hours)",
    formatTable(
      [
        "Profiles Uploaded",
        "Pending Review (new)",
        "Roles with new profiles",
      ],
      [[String(freshProfiles), String(pendingReviewSourced), String(rolesWithProfiles)]],
    ),
    "",
    "Account Manager performance (last 24 hours)",
    formatTable(
      [
        "Roles Worked",
        "Pending Review Progression",
        "Internal Screening Submissions",
        "Interview Stage Movements",
        "Select Progressions",
      ],
      [
        [
          String(rolesWorked.size),
          String(movedInternal),
          String(movedSubmitted),
          String(movedInterviewing),
          String(movedSelect),
        ],
      ],
    ),
    "",
    "SLA Breach Count (Account Managers)",
    amNames.length > 0
      ? formatTable(
          ["Account Manager", ...amNames],
          [["SLA Breach", ...amCounts.map(String)]],
        )
      : "No active account managers.",
    "",
    buildSlaSection(uniqueBreachedSubmissions, now, jobMap, slaClockStarts, {
      includeJob: true,
    }),
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

  return [
    "Jobs Assigned",
    formatTable(
      [
        "Super High Priority Jobs",
        "Candidates Pending Review",
        "Candidates Internal Screening in Progress",
        "Being Submitted to Client",
      ],
      [
        [
          String(superHighJobs),
          String(count("pending_review")),
          String(count("internal_screening")),
          String(count("being_submitted")),
        ],
      ],
    ),
  ].join("\n");
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
    return "Job Changes\nNo job changes in the last 24 hours.";
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
  const changedIds = new Set(
    activities
      .filter(
        (activity) =>
          activity.entityType === "submission" &&
          inDigestWindow(activity.createdAt, windowStart, now),
      )
      .map((activity) => activity.entityId),
  );

  const recent = rows
    .filter(
      (row) =>
        inDigestWindow(row.submissionDate, windowStart, now) ||
        changedIds.has(row.id),
    )
    .sort(
      (a, b) =>
        (parseDigestDate(b.submissionDate)?.getTime() ?? 0) -
        (parseDigestDate(a.submissionDate)?.getTime() ?? 0),
    )
    .slice(0, 12);

  if (recent.length === 0) {
    return "Candidate Updates:\nNo candidate updates in the last 24 hours.";
  }

  return [
    "Candidate Updates:",
    formatTable(
      ["Candidate ID", "Field Updated", "Present Value", "Internal Feedback"],
      recent.map((row) => [
        row.submissionCode?.trim() || row.id.slice(0, 8),
        "Submission Status",
        submissionExactStatusLabel(row),
        row.internalFeedback?.trim() || row.interviewStage?.trim() || "—",
      ]),
    ),
  ].join("\n");
}

export interface DailyDigestResult {
  attempted: number;
  sent: number;
  errors: string[];
}

export async function sendDailyDigests(now = new Date()): Promise<DailyDigestResult> {
  const windowStart = rollingWindowStart(now);
  const digestDate = formatOvatoDate(now);

  const [
    submissions,
    jobs,
    queries,
    amRecipients,
    partnerUsers,
    allAllocations,
    activities,
  ] = await Promise.all([
    listSubmissions({ includePartnerIdentity: true }),
    listJobs({ includeArchived: false }),
    listPartnerQueries(),
    getActiveAccountManagerDigestRecipients(),
    listUsers({ role: "partner", status: "active" }),
    listAllocations({ includePartnerIdentity: false }),
    listActivities({ maxRecords: 500 }).catch(() => [] as Activity[]),
  ]);

  const activeAllocationsByPartner = new Map<string, Set<string>>();
  for (const allocation of allAllocations) {
    if (
      allocation.status === "archived" ||
      allocation.status === "cancelled"
    ) {
      continue;
    }
    const partnerKey = allocation.partnerId?.trim();
    if (!partnerKey) {
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

  for (const partner of partnerUsers) {
    if (!partner.email?.trim() || !partner.partnerId) {
      continue;
    }
    const owned = submissions.filter((row) => row.partnerId === partner.partnerId);
    const allocatedJobIds =
      activeAllocationsByPartner.get(partner.partnerId) ?? new Set<string>();

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

    const digestBody = [
      digestDate,
      "",
      "New Accounts Activated",
      buildPartnerNewAccountsSection(
        partner.partnerId,
        allAllocations,
        jobs,
        windowStart,
        now,
      ),
      "",
      formatCountLine(
        "New Roles Activated – Available to be claimed",
        newRoleTitles.length,
      ),
      newRoleTitles.length === 0
        ? "No new open roles in the last 24 hours."
        : newRoleTitles.map((title) => `  • ${title}`).join("\n"),
      "",
      buildPartnerSnapshot(owned, allocatedJobIds, jobs),
      "",
      buildPartnerJobChanges(activities, allocatedJobIds, jobs, windowStart, now),
      "",
      buildPartnerCandidateUpdates(owned, activities, windowStart, now),
    ].join("\n");

    result.attempted += 1;
    const sendResult = await sendEmailSafe({
      to: partner.email,
      template: "daily_digest_partner",
      data: {
        name: partner.fullName,
        digestBody,
        digestDate,
        dashboardUrl: `${baseUrl}/partner`,
      },
    });
    if (sendResult) {
      result.sent += 1;
    } else {
      result.errors.push(`Partner digest failed for ${partner.email}`);
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

  return result;
}
