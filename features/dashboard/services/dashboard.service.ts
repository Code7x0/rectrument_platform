import { listClients } from "@/features/clients/services";
import { listJobs } from "@/features/jobs/services";
import { listPartners } from "@/features/partners/services";
import { listDocuments } from "@/features/partner-documents/services";
import { listAllocations } from "@/features/allocations/services";
import {
  listPayouts,
  listPayoutsForPartner,
  summarizePartnerEarnings,
} from "@/features/payouts/services";
import {
  listPartnerSubmissions,
  listReviewQueueSubmissions,
  listSubmissions,
} from "@/features/submissions/services";
import { listPartnerWorkTasks } from "@/features/tasks/services";
import { listRecentActivities } from "@/features/workflows/services/activity.service";
import { listUsers } from "@/services/users/users.service";
import { getUsersSummary } from "@/features/users/services";
import { DOCUMENT_TYPE_LABELS } from "@/features/partner-documents/types";
import { JOB_STATUS_LABELS } from "@/features/jobs/types";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";
import { PAYOUT_STATUS_LABELS } from "@/features/payouts/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { mapActivitiesToFeed } from "@/features/dashboard/services/activity-feed";
import type {
  AccountManagerDashboardData,
  AdminDashboardData,
  PartnerDashboardData,
  SuperAdminDashboardData,
} from "@/features/dashboard/types";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function isThisMonth(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return Date.parse(value) >= Date.parse(startOfMonthIso());
}

/** Isolate optional CRM sources so one missing table cannot take down dashboards. */
async function settledSource<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[dashboard] ${label} unavailable`, error);
    return fallback;
  }
}

/**
 * Super Admin command center — users, approvals, invitations, health.
 */
export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const { listAccountManagersDirectory } = await import(
    "@/features/account-managers/services/account-managers.service"
  );

  const [
    summary,
    users,
    activity,
    submissions,
    amDirectory,
    partners,
    jobs,
    clients,
  ] = await Promise.all([
    getUsersSummary(),
    listUsers(),
    settledSource(
      "activities",
      listRecentActivities(10, { entityTypes: ["user"] }),
      [],
    ),
    settledSource(
      "submissions",
      listSubmissions({ includePartnerIdentity: true }),
      [],
    ),
    settledSource(
      "accountManagers",
      listAccountManagersDirectory(),
      {
        rows: [],
        summary: { total: 0, active: 0, inactive: 0 },
      },
    ),
    settledSource(
      "partners",
      listPartners({ includeArchived: false }),
      [],
    ),
    settledSource("jobs", listJobs({ includeArchived: false }), []),
    settledSource("clients", listClients({ includeArchived: false }), []),
  ]);

  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = users.filter((u) => u.status !== "active").length;
  const talentPartners = partners.filter((p) => p.status === "active").length;
  // Same source of truth as Admin Candidates + Submission Count: linked submissions.
  const submissionCount = submissions.length;
  const candidateCount = submissionCount;

  const recentInvitations = users
    .filter((u) => u.registrationStatus === "invitation_pending")
    .slice(0, 8)
    .map((u) => ({
      id: u.id,
      title: u.fullName,
      subtitle: u.email,
      badge: u.role === "admin" ? "Admin" : "Account Manager",
      meta: u.invitationExpiry
        ? `Expires ${formatDate(u.invitationExpiry)}`
        : undefined,
      href: "/super-admin/users",
    }));

  const recentApprovals = users
    .filter(
      (u) =>
        u.role === "partner" &&
        (u.registrationStatus === "active" ||
          u.registrationStatus === "approved") &&
        Boolean(u.approvalDate),
    )
    .sort((a, b) =>
      (b.approvalDate ?? "").localeCompare(a.approvalDate ?? ""),
    )
    .slice(0, 8)
    .map((u) => ({
      id: u.id,
      title: u.fullName,
      subtitle: u.email,
      badge: "Approved",
      meta: u.approvalDate ? formatDate(u.approvalDate) : undefined,
      href: "/admin/approvals",
    }));

  return {
    metrics: [
      {
        id: "users",
        label: "Users",
        value: summary.totalUsers,
        href: "/super-admin/users",
      },
      {
        id: "pending-approvals",
        label: "Pending Approvals",
        value: summary.pendingApprovals,
        href: "/admin/approvals",
        tone: summary.pendingApprovals > 0 ? "attention" : "default",
        hint: "Talent Partner registrations",
      },
      {
        id: "ams-active",
        label: "Active AMs",
        value: amDirectory.summary.active,
        href: "/admin/account-managers",
        tone: "positive",
      },
      {
        id: "ams-inactive",
        label: "Inactive AMs",
        value: amDirectory.summary.inactive,
        href: "/admin/account-managers",
        tone: "muted",
      },
      {
        id: "candidates",
        label: "Candidate Count",
        value: candidateCount,
        href: "/admin/candidates",
        hint: "Airtable Candidates rows",
      },
      {
        id: "submissions",
        label: "Submission Count",
        value: submissionCount,
        href: "/admin/candidates",
        hint: "Airtable submission rows",
      },
      {
        id: "partners",
        label: "Talent Partners",
        value: talentPartners,
        href: "/admin/partners",
      },
      {
        id: "jobs",
        label: "Open Jobs",
        value: jobs.filter((j) => j.status === "open").length,
        href: "/admin/jobs",
      },
      {
        id: "clients",
        label: "Clients",
        value: clients.length,
        href: "/admin/clients",
      },
    ],
    companyHealth: [
      {
        id: "active-users",
        label: "Active Users",
        value: activeUsers,
        href: "/super-admin/users",
        tone: "positive",
      },
      {
        id: "inactive-users",
        label: "Inactive Users",
        value: inactiveUsers,
        href: "/super-admin/users",
        tone: "muted",
      },
      {
        id: "pending-regs",
        label: "Pending Registrations",
        value: summary.pendingApprovals,
        href: "/admin/approvals",
        tone: summary.pendingApprovals > 0 ? "attention" : "default",
      },
      {
        id: "am-total",
        label: "Account Managers",
        value: amDirectory.summary.total,
        href: "/admin/account-managers",
      },
    ],
    quickActions: [
      {
        id: "invite-admin",
        label: "Invite Admin",
        description: "Send a staff invitation",
        href: "/super-admin/users",
      },
      {
        id: "invite-am",
        label: "Invite Account Manager",
        description: "Grow the operations team",
        href: "/super-admin/users",
      },
      {
        id: "manage-ams",
        label: "Account Managers",
        description: "Active / inactive & client assignment",
        href: "/admin/account-managers",
      },
      {
        id: "review-regs",
        label: "Review Registrations",
        description: "Approve or reject Talent Partners",
        href: "/admin/approvals",
      },
      {
        id: "manage-roles",
        label: "Role Management",
        description: "Invites and access control",
        href: "/super-admin/users",
      },
    ],
    recentInvitations,
    recentApprovals,
    recentActivity: mapActivitiesToFeed(activity),
  };
}

/**
 * Admin business operations command center.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const { listAccountManagersDirectory } = await import(
    "@/features/account-managers/services/account-managers.service"
  );

  const [
    clients,
    allJobs,
    partners,
    allDocuments,
    reviewQueue,
    payouts,
    submissions,
    activity,
    amDirectory,
  ] = await Promise.all([
    settledSource("clients", listClients({ status: "active" }), []),
    settledSource("jobs", listJobs({ includeArchived: false }), []),
    settledSource(
      "partners",
      listPartners({ status: "active", includeArchived: false }),
      [],
    ),
    settledSource("documents", listDocuments(), []),
    settledSource("reviewQueue", listReviewQueueSubmissions(), []),
    settledSource("payouts", listPayouts({ includePartnerIdentity: true }), []),
    settledSource(
      "submissions",
      listSubmissions({ includePartnerIdentity: true }),
      [],
    ),
    settledSource(
      "activities",
      listRecentActivities(10, {
        entityTypes: ["submission", "partner_document", "payout"],
      }),
      [],
    ),
    settledSource(
      "accountManagers",
      listAccountManagersDirectory(),
      {
        rows: [],
        summary: { total: 0, active: 0, inactive: 0 },
      },
    ),
  ]);

  const jobs = allJobs.filter((job) => job.status === "open");
  const documents = allDocuments.filter(
    (doc) => doc.verificationStatus === "pending",
  );

  const pendingPayouts = payouts.filter(
    (p) =>
      p.payoutStatus === "eligible" || p.payoutStatus === "processing",
  );

  const placementsThisMonth = submissions.filter(
    (s) => s.status === "joined" && isThisMonth(s.submissionDate),
  ).length;

  const recentJobs = allJobs.slice(0, 6).map((job) => ({
    id: job.id,
    title: job.title,
    subtitle: job.clientName ?? "Client",
    badge: JOB_STATUS_LABELS[job.status],
    href: `/admin/jobs`,
    meta: job.location ?? undefined,
  }));

  const recentCandidates = submissions.slice(0, 6).map((row) => ({
    id: row.id,
    title: row.candidateName ?? "Candidate",
    subtitle: row.jobTitle ?? "Job",
    badge: SUBMISSION_STATUS_LABELS[row.status],
    href: "/admin/candidates",
  }));

  const recentDocuments = allDocuments.slice(0, 6).map((doc) => ({
    id: doc.id,
    title: DOCUMENT_TYPE_LABELS[doc.documentType],
    subtitle: doc.partnerName ?? "Partner",
    badge: doc.verificationStatus,
    href: "/admin/documents",
    meta: doc.uploadedAt ? formatDate(doc.uploadedAt) : undefined,
  }));

  const recentPayouts = payouts.slice(0, 6).map((payout) => ({
    id: payout.id,
    title: payout.candidateName ?? "Candidate",
    subtitle: payout.jobTitle ?? "Job",
    badge: PAYOUT_STATUS_LABELS[payout.payoutStatus],
    href: "/admin/payouts",
    meta:
      payout.amount != null
        ? formatCurrency(payout.amount, payout.currency)
        : undefined,
  }));

  return {
    metrics: [
      {
        id: "clients",
        label: "Active Clients",
        value: clients.length,
        href: "/admin/clients",
      },
      {
        id: "jobs",
        label: "Open Jobs",
        value: jobs.length,
        href: "/admin/jobs",
      },
      {
        id: "ams-active",
        label: "Active AMs",
        value: amDirectory.summary.active,
        href: "/admin/account-managers",
        tone: "positive",
      },
      {
        id: "ams-inactive",
        label: "Inactive AMs",
        value: amDirectory.summary.inactive,
        href: "/admin/account-managers",
        tone: "muted",
      },
      {
        id: "docs",
        label: "Pending Documents",
        value: documents.length,
        href: "/admin/documents",
        tone: documents.length > 0 ? "attention" : "default",
      },
      {
        id: "reviews",
        label: "Pending Candidate Reviews",
        value: reviewQueue.length,
        href: "/admin/candidates",
        tone: reviewQueue.length > 0 ? "attention" : "default",
      },
      {
        id: "payouts",
        label: "Pending Payouts",
        value: pendingPayouts.length,
        href: "/admin/payouts",
        tone: pendingPayouts.length > 0 ? "attention" : "default",
      },
      {
        id: "placements",
        label: "Placements This Month",
        value: placementsThisMonth,
        href: "/admin/candidates",
        tone: "positive",
      },
      {
        id: "partners",
        label: "Active Partners",
        value: partners.length,
        href: "/admin/partners",
      },
    ],
    quickActions: [
      {
        id: "create-client",
        label: "Create Client",
        description: "Add a hiring company",
        href: "/admin/clients",
      },
      {
        id: "create-job",
        label: "Create Job",
        description: "Open a new requisition",
        href: "/admin/jobs",
      },
      {
        id: "manage-ams",
        label: "Account Managers",
        description: "Active / inactive & assign to clients",
        href: "/admin/account-managers",
      },
      {
        id: "review-docs",
        label: "Review Documents",
        description: "Verify partner KYC",
        href: "/admin/documents",
      },
      {
        id: "review-partners",
        label: "Review Partners",
        description: "Approvals & workspaces",
        href: "/admin/approvals",
      },
    ],
    recentJobs,
    recentCandidates,
    recentDocuments,
    recentPayouts,
    recentActivity: mapActivitiesToFeed(activity),
  };
}

/**
 * Account Manager daily operations center.
 */
export async function getAccountManagerDashboardData(
  accountManagerId: string,
): Promise<AccountManagerDashboardData> {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const jobs = await listJobs({
    accountManagerId,
    includeArchived: false,
  });
  const jobIds = jobs.map((j) => j.id);

  const [allocations, reviewQueue, allSubmissions, activity] =
    await Promise.all([
      listAllocations({
        includePartnerIdentity: false,
        jobIds,
      }),
      listReviewQueueSubmissions({ jobIds }),
      jobIds.length === 0
        ? Promise.resolve([])
        : listSubmissions().then((rows) =>
            rows.filter((s) => jobIds.includes(s.jobId)),
          ),
      settledSource(
        "activities",
        listRecentActivities(10, {
          entityTypes: ["submission", "payout"],
        }),
        [],
      ),
    ]);

  const assignedJobs = jobs.filter((j) => j.status === "open");
  const myAllocations = allocations;
  const mySubmissions = allSubmissions;
  const myReviews = reviewQueue;

  const interviews = mySubmissions.filter((s) => s.status === "interview");
  const offers = mySubmissions.filter((s) => s.status === "offer");
  const joined = mySubmissions.filter((s) => s.status === "joined");

  const awaitingAction = myReviews.slice(0, 8).map((row) => ({
    id: row.id,
    title: row.candidateName ?? "Candidate",
    subtitle: row.jobTitle ?? "Job",
    badge: SUBMISSION_STATUS_LABELS[row.status],
    href: "/account-manager/candidates",
    meta: row.submissionDate ? formatDate(row.submissionDate) : undefined,
  }));

  const recentCandidateActivity = mySubmissions.slice(0, 6).map((row) => ({
    id: row.id,
    title: row.candidateName ?? "Candidate",
    subtitle: row.jobTitle ?? "Job",
    badge: SUBMISSION_STATUS_LABELS[row.status],
    href: "/account-manager/candidates",
  }));

  const recentPartnerActivity = myAllocations.slice(0, 6).map((row) => ({
    id: row.id,
    title: row.partnerCode || "Partner",
    subtitle: [row.jobCode, row.jobTitle].filter(Boolean).join(" · ") || "Job",
    badge: row.status,
    href: "/account-manager/allocations",
  }));

  const submissionIds = new Set(mySubmissions.map((s) => s.id));
  const scopedActivity = activity.filter(
    (row) =>
      row.entityType === "submission" && submissionIds.has(row.entityId),
  );

  return {
    metrics: [
      {
        id: "jobs",
        label: "Assigned Jobs",
        value: assignedJobs.length,
        href: "/account-manager/jobs",
      },
      {
        id: "reviews",
        label: "Pending Reviews",
        value: myReviews.length,
        href: "/account-manager/candidates",
        tone: myReviews.length > 0 ? "attention" : "default",
      },
      {
        id: "submissions",
        label: "Submissions",
        value: mySubmissions.length,
        href: "/account-manager/candidates",
      },
      {
        id: "allocations",
        label: "Partner Allocations",
        value: myAllocations.filter((a) => a.status !== "archived").length,
        href: "/account-manager/allocations",
      },
    ],
    pipeline: [
      {
        id: "interview",
        label: "Interview Pipeline",
        value: interviews.length,
        href: "/account-manager/candidates",
      },
      {
        id: "offers",
        label: "Offers",
        value: offers.length,
        href: "/account-manager/candidates",
        tone: "positive",
      },
      {
        id: "joined",
        label: "Joined",
        value: joined.length,
        href: "/account-manager/candidates",
        tone: "positive",
      },
    ],
    quickActions: [
      {
        id: "review-queue",
        label: "Open Review Queue",
        description: "Work candidates needing action",
        href: "/account-manager/candidates",
      },
      {
        id: "allocate",
        label: "Allocate Partner",
        description: "Open a job, then assign Talent Partners",
        href: "/account-manager/jobs",
      },
      {
        id: "jobs",
        label: "View Jobs",
        description: "Your assigned requisitions",
        href: "/account-manager/jobs",
      },
      {
        id: "clients",
        label: "View Clients",
        description: "Hiring companies you support",
        href: "/account-manager/clients",
      },
    ],
    awaitingAction,
    recentCandidateActivity,
    recentPartnerActivity,
    recentActivity: mapActivitiesToFeed(scopedActivity, {
      roleBase: "/account-manager",
    }),
  };
}

/**
 * Talent Partner daily work + earnings command center.
 */
export async function getPartnerDashboardData(
  partnerId: string,
  partnerName: string,
): Promise<PartnerDashboardData> {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const [tasks, submissions, payouts] = await Promise.all([
    listPartnerWorkTasks(partnerId),
    listPartnerSubmissions(partnerId),
    settledSource("payouts", listPayoutsForPartner(partnerId), []),
  ]);

  const earnings = summarizePartnerEarnings(payouts);

  const underReview = submissions.filter((s) =>
    ["submitted", "internal_review", "client_review"].includes(s.status),
  );
  const interviews = submissions.filter((s) => s.status === "interview");
  const offers = submissions.filter((s) => s.status === "offer");
  const joined = submissions.filter((s) => s.status === "joined");

  return {
    partnerName,
    metrics: [
      {
        id: "jobs",
        label: "Assigned Jobs",
        value: tasks.length,
        href: "/partner/jobs",
        tone: tasks.some((t) => t.remainingProfiles > 0)
          ? "attention"
          : "default",
      },
      {
        id: "submitted",
        label: "Candidates Submitted",
        value: submissions.length,
        href: "/partner/candidates",
      },
      {
        id: "review",
        label: "Under Review",
        value: underReview.length,
        href: "/partner/candidates",
      },
      {
        id: "interviews",
        label: "Interviews",
        value: interviews.length,
        href: "/partner/candidates",
      },
      {
        id: "offers",
        label: "Offers",
        value: offers.length,
        href: "/partner/candidates",
        tone: "positive",
      },
      {
        id: "joined",
        label: "Joined",
        value: joined.length,
        href: "/partner/candidates",
        tone: "positive",
      },
    ],
    earnings: [
      {
        id: "pending-earnings",
        label: "Pending Earnings",
        value: formatCurrency(earnings.pendingEarnings, earnings.currency),
        href: "/partner/payments",
        tone: earnings.pendingEarnings > 0 ? "attention" : "default",
      },
      {
        id: "paid-earnings",
        label: "Paid Earnings",
        value: formatCurrency(earnings.paidEarnings, earnings.currency),
        href: "/partner/payments",
        tone: "positive",
      },
    ],
    todaysWork: tasks.slice(0, 6).map((task) => ({
      id: task.id,
      title: task.jobTitle,
      subtitle: task.clientName ?? "Client",
      badge:
        task.remainingProfiles > 0
          ? `${task.remainingProfiles} remaining`
          : "Complete",
      href: "/partner/jobs",
      meta: task.priority ?? undefined,
    })),
    recentEarnings: payouts.slice(0, 6).map((payout) => ({
      id: payout.id,
      title: payout.candidateName ?? "Candidate",
      subtitle: payout.jobTitle ?? "Job",
      badge: PAYOUT_STATUS_LABELS[payout.payoutStatus],
      href: "/partner/payments",
      meta:
        payout.amount != null
          ? formatCurrency(payout.amount, payout.currency)
          : undefined,
    })),
    recentCandidateUpdates: submissions.slice(0, 6).map((row) => ({
      id: row.id,
      title: row.candidateName ?? "Candidate",
      subtitle: row.jobTitle ?? "Job",
      badge: SUBMISSION_STATUS_LABELS[row.status],
      href: "/partner/candidates",
    })),
    // Own submissions only — never the global activity feed.
    recentActivity: submissions.slice(0, 8).map((row) => ({
      id: `sub_${row.id}`,
      title: row.candidateName ?? "Candidate",
      subtitle: `${row.jobTitle ?? "Job"} · ${SUBMISSION_STATUS_LABELS[row.status]}`,
      timestamp: row.submissionDate ?? new Date().toISOString(),
      href: "/partner/candidates",
    })),
    quickActions: [
      {
        id: "jobs",
        label: "My Jobs",
        description: "Open assigned work",
        href: "/partner/jobs",
      },
      {
        id: "submit",
        label: "Submit Candidate",
        description: "From your work queue",
        href: "/partner/jobs",
      },
      {
        id: "earnings",
        label: "My Earnings",
        description: "Payout status & history",
        href: "/partner/payments",
      },
      {
        id: "docs",
        label: "My Documents",
        description: "KYC & agreement files",
        href: "/partner/documents",
      },
    ],
  };
}
