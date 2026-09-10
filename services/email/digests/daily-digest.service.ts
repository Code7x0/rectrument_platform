import { listAllocations } from "@/features/allocations/services";
import { listPartnerQueries } from "@/features/feedback/services/partner-queries.service";
import { listJobs } from "@/features/jobs/services";
import {
  matchesSubmissionStatusGroup,
  submissionExactStatusLabel,
} from "@/features/submissions/lib/submission-status-buckets";
import { listSubmissions } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import {
  fanOutEmail,
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

const SLA_HOURS = 48;

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

function parseSubmissionDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function submissionOwnedByAm(
  submission: { jobId: string },
  jobMap: Map<string, { accountManagerId: string | null; accountManagerIds: string[] }>,
  accountManagerId: string,
): boolean {
  const job = jobMap.get(submission.jobId);
  if (!job) {
    return false;
  }
  if (job.accountManagerId === accountManagerId) {
    return true;
  }
  return job.accountManagerIds.includes(accountManagerId);
}

function inWindow(
  value: string | null | undefined,
  windowStart: Date,
  now: Date,
): boolean {
  const parsed = parseSubmissionDate(value);
  return parsed != null && parsed >= windowStart && parsed <= now;
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
        ["Designation", "Count"],
        [...jobs.entries()].map(([designation, count]) => [
          designation,
          String(count),
        ]),
      ),
    );
  }
  return lines.join("\n");
}

function buildSlaSection(rows: Submission[], now: Date): string {
  const cutoff = new Date(now.getTime() - SLA_HOURS * 60 * 60 * 1000);
  const breached = rows.filter((row) => {
    if (
      !matchesSubmissionStatusGroup(row, "pending_review") &&
      !matchesSubmissionStatusGroup(row, "internal_screening")
    ) {
      return false;
    }
    const submitted = parseSubmissionDate(row.submissionDate);
    return submitted != null && submitted <= cutoff;
  });

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

  for (const [client, clientRows] of byClient) {
    lines.push("", `Client Name: ${client}`);
    lines.push(
      formatTable(
        [
          "Role",
          "Candidate Name",
          "Date Recommended",
          "SLA Breach (In Days)",
          "Status",
        ],
        clientRows.map((row) => {
          const submitted = parseSubmissionDate(row.submissionDate);
          const breachDays = submitted
            ? String(
                Math.max(
                  0,
                  Math.floor(
                    (now.getTime() - submitted.getTime()) /
                      (24 * 60 * 60 * 1000),
                  ) - SLA_HOURS / 24,
                ),
              )
            : "—";
          const dateLabel = submitted
            ? submitted.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })
            : "—";
          return [
            row.jobTitle ?? "Role",
            row.candidateName ?? "Candidate",
            dateLabel,
            breachDays,
            submissionExactStatusLabel(row),
          ];
        }),
      ),
    );
  }

  return lines.join("\n");
}

function buildPartnerSnapshot(rows: Submission[]): string {
  const count = (group: Parameters<typeof matchesSubmissionStatusGroup>[1]) =>
    rows.filter((row) => matchesSubmissionStatusGroup(row, group)).length;

  const superHigh = rows.filter((row) => row.jobPriority === "urgent").length;

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
          String(superHigh),
          String(count("pending_review")),
          String(count("internal_screening")),
          String(count("being_submitted")),
        ],
      ],
    ),
  ].join("\n");
}

function buildPartnerCandidateUpdates(rows: Submission[]): string {
  const recent = rows
    .filter((row) => row.submissionDate)
    .sort(
      (a, b) =>
        (parseSubmissionDate(b.submissionDate)?.getTime() ?? 0) -
        (parseSubmissionDate(a.submissionDate)?.getTime() ?? 0),
    )
    .slice(0, 8);

  if (recent.length === 0) {
    return "Candidate Updates:\nNo recent candidate updates.";
  }

  return [
    "Candidate Updates:",
    formatTable(
      ["Candidate ID", "Field Updated", "Present Value", "Internal Feedback"],
      recent.map((row) => [
        row.submissionCode?.trim() || row.id.slice(0, 8),
        "Submission Status",
        submissionExactStatusLabel(row),
        row.remarks?.trim() || row.interviewStage?.trim() || "—",
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

  const [submissions, jobs, queries, amUsers, partnerUsers] = await Promise.all([
    listSubmissions({ includePartnerIdentity: true }),
    listJobs({ includeArchived: false }),
    listPartnerQueries(),
    listUsers({ role: "account_manager", status: "active" }),
    listUsers({ role: "partner", status: "active" }),
  ]);

  const jobMap = new Map(
    jobs.map((job) => [
      job.id,
      {
        accountManagerId: job.accountManagerId,
        accountManagerIds: job.accountManagerIds ?? [],
      },
    ]),
  );

  const result: DailyDigestResult = { attempted: 0, sent: 0, errors: [] };
  const baseUrl = appBaseUrl();

  for (const am of amUsers) {
    const amId = am.accountManagerId ?? am.id;
    if (!am.email?.trim() || !amId) {
      continue;
    }

    const owned = submissions.filter((row) =>
      submissionOwnedByAm(row, jobMap, amId),
    );
    const newInWindow = owned.filter((row) =>
      inWindow(row.submissionDate, windowStart, now),
    );
    const pendingAction = owned.filter(
      (row) =>
        matchesSubmissionStatusGroup(row, "pending_review") ||
        matchesSubmissionStatusGroup(row, "internal_screening"),
    );
    const slaMissing = owned.filter((row) => {
      if (
        !matchesSubmissionStatusGroup(row, "pending_review") &&
        !matchesSubmissionStatusGroup(row, "internal_screening")
      ) {
        return false;
      }
      const submitted = parseSubmissionDate(row.submissionDate);
      const cutoff = new Date(now.getTime() - SLA_HOURS * 60 * 60 * 1000);
      return submitted != null && submitted <= cutoff;
    });
    const secondLevelReviews = owned.filter(
      (row) => row.wantsSecondLevelReview || row.secondLevelReviewLabel,
    );
    const openQueries = queries.filter((query) => {
      if (query.status !== "open") {
        return false;
      }
      return inWindow(query.submittedAt, windowStart, now);
    });

    const digestBody = [
      formatCountLine(
        "New Profiles Added for your action",
        newInWindow.length,
      ),
      formatCountLine("Profiles Pending your action", pendingAction.length),
      formatCountLine("Profiles Missing SLAs", slaMissing.length),
      formatCountLine(
        "2nd Level Review Request raised",
        secondLevelReviews.length,
      ),
      "",
      buildRecommendedByClient(newInWindow),
      "",
      buildSlaSection(owned, now),
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
    const allocatedJobIds = new Set(
      (
        await listAllocations({
          partnerId: partner.partnerId,
          includePartnerIdentity: false,
        })
      )
        .filter((row) => row.status !== "archived" && row.status !== "cancelled")
        .map((row) => row.jobId),
    );

    const newRoleTitles = jobs
      .filter((job) => {
        const posted = parseSubmissionDate(job.postedDate ?? job.createdAt);
        return (
          job.status === "open" &&
          posted != null &&
          inWindow(job.postedDate ?? job.createdAt, windowStart, now)
        );
      })
      .map((job) => job.title)
      .filter(Boolean);

    const digestBody = [
      digestDate,
      "",
      "New Accounts Activated",
      "No new accounts activated in the last 24 hours.",
      "",
      formatCountLine(
        "New Roles Activated – Available to be claimed",
        newRoleTitles.length,
      ),
      newRoleTitles.length === 0
        ? "No new open roles in the last 24 hours."
        : newRoleTitles.map((title) => `  • ${title}`).join("\n"),
      "",
      buildPartnerSnapshot(owned),
      "",
      "Job Changes",
      "No job changes in the last 24 hours.",
      "",
      buildPartnerCandidateUpdates(owned),
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
    const freshProfiles = submissions.filter((row) =>
      inWindow(row.submissionDate, windowStart, now),
    ).length;
    const rolesWithProfiles = new Set(
      submissions
        .filter((row) => inWindow(row.submissionDate, windowStart, now))
        .map((row) => row.jobId)
        .filter(Boolean),
    ).size;

    const amSlaCounts = new Map<string, number>();
    for (const am of amUsers) {
      const amId = am.accountManagerId ?? am.id;
      if (!amId) {
        continue;
      }
      const owned = submissions.filter((row) =>
        submissionOwnedByAm(row, jobMap, amId),
      );
      const breached = owned.filter((row) => {
        if (
          !matchesSubmissionStatusGroup(row, "pending_review") &&
          !matchesSubmissionStatusGroup(row, "internal_screening")
        ) {
          return false;
        }
        const submitted = parseSubmissionDate(row.submissionDate);
        const cutoff = new Date(now.getTime() - SLA_HOURS * 60 * 60 * 1000);
        return submitted != null && submitted <= cutoff;
      }).length;
      amSlaCounts.set(am.fullName?.trim() || am.email || amId, breached);
    }

    const amNames = [...amSlaCounts.keys()];
    const amCounts = [...amSlaCounts.values()];

    const digestBody = [
      formatTable(
        [
          "Pending Review: Total Count",
          "Being Submitted to Client: Total Count",
          "Interviewing: Total Count",
          "Selects: Total Count",
        ],
        [[String(pendingReview), String(beingSubmitted), String(interviewing), String(selects)]],
      ),
      "",
      digestDate,
      formatTable(
        [
          "Count of Roles where profiles were added",
          "Count of fresh profiles added in 24 hours",
        ],
        [[String(rolesWithProfiles), String(freshProfiles)]],
      ),
      "",
      "SLA Breach Count (ONLY ACTIVE PARTNERS)",
      amNames.length > 0
        ? formatTable(
            ["Name", ...amNames],
            [["SLA Breach Count", ...amCounts.map(String)]],
          )
        : "No active account managers.",
      "",
      buildSlaSection(submissions, now),
    ].join("\n");

    const adminResult = await fanOutEmail(fallbackAdmins, (to) =>
      sendEmailSafe({
        to,
        template: "daily_digest_admin",
        data: {
          name: "Chief",
          digestBody,
          digestDate,
          dashboardUrl: `${baseUrl}/admin`,
        },
      }),
    );
    result.attempted += adminResult.attempted;
    result.sent += adminResult.sent;
  }

  return result;
}
