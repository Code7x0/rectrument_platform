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

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
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

function formatSubmissionLine(
  submission: {
    candidateName: string | null;
    jobTitle: string | null;
    clientName: string | null;
    resumeUrl: string | null;
  },
): string {
  const parts = [
    submission.candidateName ?? "Candidate",
    submission.jobTitle ? `— ${submission.jobTitle}` : "",
    submission.clientName ? `(${submission.clientName})` : "",
    submission.resumeUrl ? `[resume]` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function buildGroupedNewProfiles(
  rows: Array<{
    clientName: string | null;
    jobCode: string | null;
    jobTitle: string | null;
    candidateName: string | null;
    resumeUrl: string | null;
  }>,
): string {
  if (rows.length === 0) {
    return "No new profiles added today.";
  }

  const byClient = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    const client = row.clientName ?? "Client";
    const jobKey = `${row.jobCode ?? "—"} · ${row.jobTitle ?? "Role"}`;
    if (!byClient.has(client)) {
      byClient.set(client, new Map());
    }
    const jobs = byClient.get(client)!;
    if (!jobs.has(jobKey)) {
      jobs.set(jobKey, []);
    }
    jobs.get(jobKey)!.push(formatSubmissionLine(row));
  }

  const lines: string[] = ["NEW PROFILES TODAY"];
  for (const [client, jobs] of byClient) {
    lines.push(`\n${client}`);
    for (const [jobKey, names] of jobs) {
      lines.push(`  ${jobKey} — ${names.length} profile(s)`);
      for (const name of names) {
        lines.push(`    • ${name}`);
      }
    }
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
    return "SLA ALERTS\nNo 48-hour screening breaches.";
  }

  const lines = [
    "SLA ALERTS (48+ hours in Pending Review / Internal Screening)",
  ];
  for (const row of breached) {
    lines.push(
      `  • ${row.candidateName ?? "Candidate"} — ${row.jobTitle ?? "Job"} (${submissionExactStatusLabel(row)})`,
    );
  }
  return lines.join("\n");
}

function buildPartnerSnapshot(rows: Submission[]): string {
  const count = (group: Parameters<typeof matchesSubmissionStatusGroup>[1]) =>
    rows.filter((row) => matchesSubmissionStatusGroup(row, group)).length;

  return [
    "PARTNER SNAPSHOT",
    `  Interviewing: ${count("interviewing")}`,
    `  Pending Review: ${count("pending_review")}`,
    `  Internal Screening: ${count("internal_screening")}`,
    `  Being Submitted: ${count("being_submitted")}`,
    `  Selected: ${count("selected")}`,
  ].join("\n");
}

export interface DailyDigestResult {
  attempted: number;
  sent: number;
  errors: string[];
}

export async function sendDailyDigests(now = new Date()): Promise<DailyDigestResult> {
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

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
    const newToday = owned.filter((row) => {
      const submitted = parseSubmissionDate(row.submissionDate);
      return submitted != null && submitted >= todayStart;
    });
    const openQueries = queries.filter((query) => {
      if (query.status !== "open") {
        return false;
      }
      const submitted = parseSubmissionDate(query.submittedAt);
      return submitted != null && submitted >= yesterdayStart;
    });

    const digestBody = [
      buildGroupedNewProfiles(newToday),
      "",
      buildSlaSection(owned, now),
      "",
      "PARTNER QUESTIONS (since yesterday)",
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
    const newJobsToday = jobs.filter((job) => {
      if (!allocatedJobIds.has(job.id)) {
        return false;
      }
      const posted = parseSubmissionDate(job.postedDate ?? job.createdAt);
      return posted != null && posted >= todayStart;
    });

    const digestBody = [
      "JOB UPDATES / NEW ALLOCATIONS TODAY",
      newJobsToday.length === 0
        ? "No newly posted jobs on your allocated roles today. Real-time job edit alerts are sent immediately when a job changes."
        : newJobsToday
            .map((job) => `  • ${job.jobCode ?? job.title}`)
            .join("\n"),
      "",
      buildPartnerSnapshot(owned),
    ].join("\n");

    result.attempted += 1;
    const sendResult = await sendEmailSafe({
      to: partner.email,
      template: "daily_digest_partner",
      data: {
        name: partner.fullName,
        digestBody,
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
    const selectsToday = submissions.filter((row) => {
      if (!matchesSubmissionStatusGroup(row, "selected")) {
        return false;
      }
      const submitted = parseSubmissionDate(row.submissionDate);
      return submitted != null && submitted >= todayStart;
    });
    const actedToday = submissions.filter((row) => {
      if (!matchesSubmissionStatusGroup(row, "being_submitted")) {
        return false;
      }
      const submitted = parseSubmissionDate(row.submissionDate);
      return submitted != null && submitted >= todayStart;
    });

    const digestBody = [
      "SELECTS TODAY",
      selectsToday.length === 0
        ? "No new selects."
        : selectsToday
            .map(
              (row) =>
                `  • ${row.candidateName ?? "Candidate"} — ${row.jobTitle ?? "Job"} (${row.partnerCode ?? "Partner"})`,
            )
            .join("\n"),
      "",
      "SUBMITTED TO CLIENT TODAY",
      actedToday.length === 0
        ? "No profiles moved to client submission today."
        : actedToday
            .map(
              (row) =>
                `  • ${row.candidateName ?? "Candidate"} — ${row.jobTitle ?? "Job"}`,
            )
            .join("\n"),
      "",
      buildSlaSection(submissions, now),
      "",
      "NEW / UPDATED JOBS TODAY",
      jobs
        .filter((job) => {
          const posted = parseSubmissionDate(job.postedDate ?? job.createdAt);
          return posted != null && posted >= todayStart;
        })
        .map((job) => `  • ${job.jobCode ?? job.title}`)
        .join("\n") || "No job changes today.",
    ].join("\n");

    const adminResult = await fanOutEmail(fallbackAdmins, (to) =>
      sendEmailSafe({
        to,
        template: "daily_digest_admin",
        data: {
          name: "Chief",
          digestBody,
          dashboardUrl: `${baseUrl}/admin`,
        },
      }),
    );
    result.attempted += adminResult.attempted;
    result.sent += adminResult.sent;
  }

  return result;
}
