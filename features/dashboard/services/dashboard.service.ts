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
  const [summary, users, activity] = await Promise.all([
    getUsersSummary(),
    listUsers(),
    settledSource("activities", listRecentActivities(10, { entityTypes: ["user"] }), []),
  ]);

  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = users.filter((u) => u.status !== "active").length;
  const talentPartners = users.filter((u) => u.role === "partner").length;

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
        id: "pending-invites",
        label: "Pending Invitations",
        value: summary.invitationPending,
        href: "/super-admin/users",
        tone: summary.invitationPending > 0 ? "attention" : "default",
      },
      {
        id: "admins",
        label: "Admins",
        value: summary.admins,
        href: "/super-admin/users",
      },
      {
        id: "ams",
        label: "Account Managers",
        value: summary.accountManagers,
        href: "/super-admin/users",
      },
      {
        id: "partners",
        label: "Talent Partners",
        value: talentPartners,
        href: "/admin/partners",
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
        id: "review-regs",
        label: "Review Registrations",
        description: "Approve pending partners",
        href: "/admin/approvals",
      },
      {
        id: "role-mgmt",
        label: "Role Management",
        description: "Promote, demote, deactivate",
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
  const [
    clients,
    allJobs,
    partners,
    allDocuments,
    reviewQueue,
    payouts,
    submissions,
    activity,
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
    settledSource("submissions", listSubmissions(), []),
    settledSource(
      "activities",
      listRecentActivities(10, {
        entityTypes: ["submission", "partner_document", "payout"],
      }),
      [],
    ),
  ]);

  const jobs = allJobs.filter((job) => job.status === "open");
  const documents = allDocuments.filter(
    (doc) => doc.verificationStatus === "pending",
  );

  const assignedAMs = new Set(
    jobs.map((job) => job.accountManagerId).filter(Boolean),
  ).size;

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
        id: "ams",
        label: "Assigned Account Managers",
        value: assignedAMs,
        href: "/admin/jobs",
        hint: "On open jobs",
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
  const [jobs, allocations, reviewQueue, allSubmissions, activity] =
    await Promise.all([
      listJobs({
        accountManagerId,
        includeArchived: false,
      }),
      listAllocations({ includePartnerIdentity: false }),
      listReviewQueueSubmissions(),
      listSubmissions(),
      settledSource(
        "activities",
        listRecentActivities(10, {
          entityTypes: ["submission", "payout"],
        }),
        [],
      ),
    ]);

  const jobIds = new Set(jobs.map((j) => j.id));
  const assignedJobs = jobs.filter((j) => j.status === "open");
  const myAllocations = allocations.filter((a) => jobIds.has(a.jobId));
  const mySubmissions = allSubmissions.filter((s) => jobIds.has(s.jobId));
  const myReviews = reviewQueue.filter((s) => jobIds.has(s.jobId));

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
    title: row.partnerCode ?? row.partnerId,
    subtitle: row.jobTitle ?? "Job",
    badge: row.status,
    href: "/account-manager/allocations",
  }));

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
        id: "awaiting",
        label: "Candidates Awaiting Action",
        value: myReviews.length,
        href: "/account-manager/candidates",
        tone: myReviews.length > 0 ? "attention" : "default",
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
        description: "Assign Talent Partners to jobs",
        href: "/account-manager/allocations",
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
    recentActivity: mapActivitiesToFeed(activity),
  };
}

/**
 * Talent Partner daily work + earnings command center.
 */
export async function getPartnerDashboardData(
  partnerId: string,
  partnerName: string,
): Promise<PartnerDashboardData> {
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
