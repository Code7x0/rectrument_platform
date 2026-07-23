/**
 * Domain event → notification helpers.
 * Call from services after successful mutations (non-blocking).
 */

import {
  findPartnerUserId,
  notifyRole,
  publishNotification,
} from "@/features/notifications/services/notifications.service";
import type { SubmissionStatus } from "@/features/shared/entities";
import type { PayoutStatus } from "@/features/payouts/types";
import type { UserRole } from "@/types";
import { getRoleLabel } from "@/lib/auth/permissions";

function safe(promise: Promise<unknown>): void {
  void promise.catch((error) => {
    console.error("[notifications] event failed", error);
  });
}

export function notifyRegistrationSubmitted(input: {
  applicantUserId: string;
  applicantName: string;
}): void {
  safe(
    notifyRole("admin", {
      title: "New Talent Partner registration",
      description: `${input.applicantName} submitted a registration for review.`,
      type: "registration",
      category: "system",
      priority: "high",
      entityType: "user",
      entityId: input.applicantUserId,
      actionUrl: "/admin/approvals",
    }),
  );
  safe(
    notifyRole("super_admin", {
      title: "New Talent Partner registration",
      description: `${input.applicantName} submitted a registration for review.`,
      type: "registration",
      category: "system",
      priority: "medium",
      entityType: "user",
      entityId: input.applicantUserId,
      actionUrl: "/admin/approvals",
    }),
  );
}

export function notifyPartnerApproved(input: {
  partnerUserId: string;
  partnerName: string;
  loginUrl: string;
}): void {
  safe(
    publishNotification({
      recipientUserId: input.partnerUserId,
      title: "Registration approved",
      description: "Your Talent Partner application was approved. You can sign in now.",
      type: "approval",
      category: "system",
      priority: "critical",
      entityType: "user",
      entityId: input.partnerUserId,
      actionUrl: "/partner",
      // Email already sent by onboarding service
      sendEmail: false,
      emailData: { loginUrl: input.loginUrl },
    }),
  );
}

export function notifyPartnerRejected(input: {
  partnerUserId: string;
  reason: string;
}): void {
  safe(
    publishNotification({
      recipientUserId: input.partnerUserId,
      title: "Registration rejected",
      description: input.reason,
      type: "rejected",
      category: "system",
      priority: "high",
      entityType: "user",
      entityId: input.partnerUserId,
      sendEmail: false,
    }),
  );
}

export function notifyInvitationSent(input: {
  userId: string;
  role: UserRole;
  inviteUrl: string;
}): void {
  safe(
    publishNotification({
      recipientUserId: input.userId,
      title: "You're invited",
      description: `You have been invited as ${getRoleLabel(input.role)}.`,
      type: "invitation",
      category: "role_changes",
      priority: "critical",
      entityType: "user",
      entityId: input.userId,
      actionUrl: input.inviteUrl,
      sendEmail: false,
    }),
  );
}

export function notifyInvitationAccepted(input: {
  userId: string;
  userName: string;
  role: UserRole;
}): void {
  safe(
    notifyRole("admin", {
      title: "Invitation accepted",
      description: `${input.userName} accepted their ${getRoleLabel(input.role)} invitation.`,
      type: "invitation",
      category: "role_changes",
      priority: "medium",
      entityType: "user",
      entityId: input.userId,
      actionUrl: "/super-admin/users",
    }),
  );
  if (input.role === "admin" || input.role === "account_manager") {
    safe(
      notifyRole("super_admin", {
        title:
          input.role === "admin" ? "Admin created" : "Account Manager created",
        description: `${input.userName} is now active as ${getRoleLabel(input.role)}.`,
        type: "role",
        category: "role_changes",
        priority: "high",
        entityType: "user",
        entityId: input.userId,
        actionUrl: "/super-admin/users",
      }),
    );
  }
}

export function notifyRoleChanged(input: {
  userId: string;
  userName: string;
  fromRole: UserRole;
  toRole: UserRole;
}): void {
  safe(
    publishNotification({
      recipientUserId: input.userId,
      title: "Your role was updated",
      description: `Role changed from ${getRoleLabel(input.fromRole)} to ${getRoleLabel(input.toRole)}.`,
      type: "role",
      category: "role_changes",
      priority: "high",
      entityType: "user",
      entityId: input.userId,
      actionUrl: "/notifications",
    }),
  );
  safe(
    notifyRole("super_admin", {
      title: "Role promotion",
      description: `${input.userName}: ${getRoleLabel(input.fromRole)} → ${getRoleLabel(input.toRole)}.`,
      type: "role",
      category: "role_changes",
      priority: "high",
      entityType: "user",
      entityId: input.userId,
      actionUrl: "/super-admin/users",
    }),
  );
  safe(
    notifyRole("admin", {
      title: "Role change",
      description: `${input.userName}: ${getRoleLabel(input.fromRole)} → ${getRoleLabel(input.toRole)}.`,
      type: "role",
      category: "role_changes",
      priority: "medium",
      entityType: "user",
      entityId: input.userId,
      actionUrl: "/super-admin/users",
    }),
  );
}

export function notifyUserDeactivated(input: {
  userId: string;
  userName: string;
}): void {
  safe(
    notifyRole("super_admin", {
      title: "User deactivated",
      description: `${input.userName} was deactivated.`,
      type: "security",
      category: "security",
      priority: "high",
      entityType: "user",
      entityId: input.userId,
      actionUrl: "/super-admin/users",
    }),
  );
}

export async function notifyJobAssigned(input: {
  partnerId: string;
  jobTitle: string;
  jobId: string;
  allocationId: string;
}): Promise<void> {
  const partnerUserId = await findPartnerUserId(input.partnerId);
  if (!partnerUserId) {
    return;
  }
  await publishNotification({
    recipientUserId: partnerUserId,
    title: "New job assigned",
    description: `You were allocated to ${input.jobTitle}.`,
    type: "job",
    category: "jobs",
    priority: "high",
    entityType: "allocation",
    entityId: input.allocationId,
    actionUrl: "/partner/jobs",
  });
}

export async function notifyAllocationCreated(input: {
  accountManagerId: string | null;
  partnerCode: string;
  jobTitle: string;
  allocationId: string;
}): Promise<void> {
  if (!input.accountManagerId) {
    return;
  }
  await publishNotification({
    recipientUserId: input.accountManagerId,
    title: "New allocation",
    description: `${input.partnerCode} allocated to ${input.jobTitle}.`,
    type: "allocation",
    category: "jobs",
    priority: "medium",
    entityType: "allocation",
    entityId: input.allocationId,
    actionUrl: "/account-manager/allocations",
  });
}

export async function notifyCandidateSubmitted(input: {
  accountManagerId: string | null;
  candidateName: string;
  jobTitle: string;
  submissionId: string;
}): Promise<void> {
  if (input.accountManagerId) {
    await publishNotification({
      recipientUserId: input.accountManagerId,
      title: "New candidate submitted",
      description: `${input.candidateName} submitted for ${input.jobTitle}.`,
      type: "candidate",
      category: "candidates",
      priority: "high",
      entityType: "submission",
      entityId: input.submissionId,
      actionUrl: "/account-manager/candidates",
    });
  }
  await notifyRole("admin", {
    title: "Pending candidate review",
    description: `${input.candidateName} awaits review on ${input.jobTitle}.`,
    type: "candidate",
    category: "candidates",
    priority: "medium",
    entityType: "submission",
    entityId: input.submissionId,
    actionUrl: "/admin/candidates",
  });
}

const STATUS_NOTIFICATION: Partial<
  Record<
    SubmissionStatus,
    { type: "interview" | "offer" | "joined" | "rejected" | "candidate"; title: string }
  >
> = {
  interview: { type: "interview", title: "Interview scheduled" },
  offer: { type: "offer", title: "Offer received" },
  joined: { type: "joined", title: "Candidate joined" },
  rejected: { type: "rejected", title: "Candidate rejected" },
  client_review: { type: "candidate", title: "Candidate under client review" },
  internal_review: { type: "candidate", title: "Candidate under review" },
};

export async function notifySubmissionStatusChanged(input: {
  partnerId: string;
  candidateName: string;
  jobTitle: string;
  submissionId: string;
  toStatus: SubmissionStatus;
}): Promise<void> {
  const config = STATUS_NOTIFICATION[input.toStatus];
  if (!config) {
    return;
  }

  const partnerUserId = await findPartnerUserId(input.partnerId);
  if (!partnerUserId) {
    return;
  }

  await publishNotification({
    recipientUserId: partnerUserId,
    title: config.title,
    description: `${input.candidateName} on ${input.jobTitle} is now ${input.toStatus.replace(/_/g, " ")}.`,
    type: config.type,
    category: "candidates",
    priority: input.toStatus === "joined" ? "critical" : "high",
    entityType: "submission",
    entityId: input.submissionId,
    actionUrl: "/partner/candidates",
    sendEmail: input.toStatus === "joined",
    emailTemplate: input.toStatus === "joined" ? "candidate_joined" : undefined,
    emailData:
      input.toStatus === "joined"
        ? {
            candidateName: input.candidateName,
            jobTitle: input.jobTitle,
          }
        : undefined,
  });
}

export async function notifyDocumentVerified(input: {
  partnerId: string;
  documentType: string;
  documentId: string;
}): Promise<void> {
  const partnerUserId = await findPartnerUserId(input.partnerId);
  if (!partnerUserId) {
    return;
  }
  await publishNotification({
    recipientUserId: partnerUserId,
    title: "Document verified",
    description: `Your ${input.documentType} document was verified.`,
    type: "documents",
    category: "documents",
    priority: "medium",
    entityType: "partner_document",
    entityId: input.documentId,
    actionUrl: "/partner/documents",
  });
}

export async function notifyDocumentRejected(input: {
  partnerId: string;
  documentType: string;
  documentId: string;
  reason: string;
}): Promise<void> {
  const partnerUserId = await findPartnerUserId(input.partnerId);
  if (!partnerUserId) {
    return;
  }
  await publishNotification({
    recipientUserId: partnerUserId,
    title: "Document rejected",
    description: `${input.documentType}: ${input.reason}`,
    type: "documents",
    category: "documents",
    priority: "high",
    entityType: "partner_document",
    entityId: input.documentId,
    actionUrl: "/partner/documents",
  });
}

export async function notifyDocumentUploaded(input: {
  partnerId: string;
  partnerLabel: string;
  documentType: string;
  documentId: string;
}): Promise<void> {
  await notifyRole("admin", {
    title: "Pending document verification",
    description: `${input.partnerLabel} uploaded ${input.documentType}.`,
    type: "documents",
    category: "documents",
    priority: "high",
    entityType: "partner_document",
    entityId: input.documentId,
    actionUrl: "/admin/documents",
  });
  await notifyRole("account_manager", {
    title: "Partner document uploaded",
    description: `A partner uploaded ${input.documentType}.`,
    type: "documents",
    category: "documents",
    priority: "low",
    entityType: "partner_document",
    entityId: input.documentId,
    actionUrl: "/account-manager/candidates",
  });
}

export async function notifyPayoutStatusChanged(input: {
  partnerId: string;
  payoutId: string;
  candidateName: string;
  toStatus: PayoutStatus;
  amountLabel?: string;
}): Promise<void> {
  const partnerUserId = await findPartnerUserId(input.partnerId);
  if (!partnerUserId) {
    return;
  }

  if (input.toStatus === "eligible") {
    await publishNotification({
      recipientUserId: partnerUserId,
      title: "Payout eligible",
      description: `${input.candidateName} is now payout eligible${input.amountLabel ? ` (${input.amountLabel})` : ""}.`,
      type: "payout",
      category: "payouts",
      priority: "high",
      entityType: "payout",
      entityId: input.payoutId,
      actionUrl: "/partner/payments",
      sendEmail: true,
      emailTemplate: "payout_approved",
      emailData: {
        candidateName: input.candidateName,
        amount: input.amountLabel ?? "",
      },
    });
    await notifyRole("admin", {
      title: "Pending payout",
      description: `${input.candidateName} payout is eligible.`,
      type: "payout",
      category: "payouts",
      priority: "medium",
      entityType: "payout",
      entityId: input.payoutId,
      actionUrl: "/admin/payouts",
    });
  }

  if (input.toStatus === "paid" || input.toStatus === "completed") {
    await publishNotification({
      recipientUserId: partnerUserId,
      title: "Payout paid",
      description: `Payment for ${input.candidateName} was marked paid.`,
      type: "payout",
      category: "payouts",
      priority: "critical",
      entityType: "payout",
      entityId: input.payoutId,
      actionUrl: "/partner/payments",
    });
  }
}

/** Call when company settings mutate (Feature settings module). */
export function notifyCompanySettingChanged(input: {
  settingLabel: string;
  actorName: string;
}): void {
  safe(
    notifyRole("super_admin", {
      title: "Company setting changed",
      description: `${input.actorName} updated ${input.settingLabel}.`,
      type: "settings",
      category: "system",
      priority: "high",
      entityType: "system",
      actionUrl: "/super-admin",
    }),
  );
}
