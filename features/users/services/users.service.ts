import { randomBytes } from "crypto";

import { createPartner } from "@/features/partners/services/partners.service";
import { updatePartner } from "@/features/partners/services/partners.service";
import { findPartnerById } from "@/features/partners/repositories/partners.repository";
import {
  listDocumentsForPartner,
  stageDocumentFile,
  uploadPartnerDocument,
} from "@/features/partner-documents/services/documents.service";
import type { PartnerDocumentType } from "@/features/partner-documents/types";
import { recordActivity } from "@/features/workflows/services/activity.service";
import { sendEmail } from "@/services/email";
import {
  createUserRecord,
  findUserByEmail,
  findUserByInvitationToken,
  getUserById,
  listUsers,
  updateUserRecord,
} from "@/services/users/users.service";
import { getRoleLabel } from "@/lib/auth/permissions";
import { APP_NAME } from "@/lib/constants";
import type { IdentityVisibility, User, UserRole } from "@/types";

import type {
  InviteStaffInput,
  PendingPartnerApplication,
  PartnerRegistrationInput,
  UsersSummary,
  UserListItem,
} from "@/features/users/types";

const INVITE_TTL_DAYS_FALLBACK = 7;

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function createInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

async function invitationExpiryDate(): Promise<string> {
  let days = INVITE_TTL_DAYS_FALLBACK;
  try {
    const { getInvitationExpiryDays } = await import(
      "@/features/settings/services"
    );
    days = await getInvitationExpiryDays();
  } catch {
    days = INVITE_TTL_DAYS_FALLBACK;
  }
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function safeActivity(
  input: Parameters<typeof recordActivity>[0],
): Promise<void> {
  try {
    await recordActivity(input);
  } catch (error) {
    console.error("[users] activity write failed", error);
  }
}

/**
 * Public Talent Partner registration.
 * Creates Partner + inactive User. Does NOT create/activate Clerk.
 */
export async function submitPartnerRegistration(
  input: PartnerRegistrationInput,
  files: {
    resume?: { filename: string; contentType: string; data: Buffer; size: number };
    pan: { filename: string; contentType: string; data: Buffer; size: number };
    aadhaar: {
      filename: string;
      contentType: string;
      data: Buffer;
      size: number;
    };
    agreement: {
      filename: string;
      contentType: string;
      data: Buffer;
      size: number;
    };
  },
): Promise<{ user: User; partnerId: string }> {
  if (!input.agreementAccepted) {
    throw new Error("Agreement must be accepted");
  }

  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const registrationNotes = [
    `Self-registered Talent Partner.`,
    `Experience: ${input.experience}`,
    input.state ? `State: ${input.state}` : null,
    input.skills ? `Skills: ${input.skills}` : null,
    input.bankDetails ? `Bank: ${input.bankDetails}` : null,
    `Identity visibility preference: ${input.identityVisibility}`,
  ]
    .filter(Boolean)
    .join("\n");

  const partner = await createPartner({
    companyName: fullName,
    contactName: fullName,
    email: input.email,
    phone: input.phone,
    specialization: input.skills,
    status: "pending",
    verificationStatus: "pending",
    identityVisibility: input.identityVisibility,
    city: input.city,
    state: input.state,
    skills: input.skills,
    experience: input.experience,
    bankDetails: input.bankDetails || undefined,
    notes: registrationNotes,
  });

  const user = await createUserRecord({
    fullName,
    email: input.email,
    role: "partner",
    status: "inactive",
    registrationStatus: "pending",
    identityVisibility: input.identityVisibility,
    partnerId: partner.id,
    phone: input.phone,
    city: input.city,
    state: input.state,
    skills: input.skills,
    experience: input.experience,
    bankDetails: input.bankDetails || null,
  });

  const uploadSlots: Array<{
    type: PartnerDocumentType;
    file: {
      filename: string;
      contentType: string;
      data: Buffer;
      size: number;
    };
  }> = [
    { type: "pan", file: files.pan },
    { type: "aadhaar", file: files.aadhaar },
    { type: "agreement", file: files.agreement },
  ];

  for (const slot of uploadSlots) {
    const upload = await stageDocumentFile(slot.file);
    await uploadPartnerDocument({
      partnerId: partner.id,
      documentType: slot.type,
      upload,
    });
  }

  if (files.resume) {
    await updatePartner(partner.id, {
      notes:
        `${partner.notes ?? ""}\nResume on file: ${files.resume.filename}`.trim(),
    }).catch(() => undefined);
  }

  await safeActivity({
    entityType: "user",
    entityId: user.id,
    action: "registration_submitted",
    toStatus: "pending",
    actorUserId: user.id,
    note: `Talent Partner registration submitted (${input.identityVisibility})`,
  });

  const { notifyRegistrationSubmitted } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyRegistrationSubmitted({
    applicantUserId: user.id,
    applicantName: fullName,
  });

  return { user, partnerId: partner.id };
}

export async function listPendingPartnerApplications(): Promise<
  PendingPartnerApplication[]
> {
  const pendingUsers = await listUsers({
    role: "partner",
    registrationStatus: "pending",
  });

  const results: PendingPartnerApplication[] = [];

  for (const user of pendingUsers) {
    const partner = user.partnerId
      ? await findPartnerById(user.partnerId)
      : null;
    const documents = user.partnerId
      ? await listDocumentsForPartner(user.partnerId)
      : [];
    results.push({
      user,
      partner,
      documents,
      appliedAt: user.createdAt,
    });
  }

  return results.sort((a, b) => {
    const aTime = a.appliedAt ? Date.parse(a.appliedAt) : 0;
    const bTime = b.appliedAt ? Date.parse(b.appliedAt) : 0;
    return bTime - aTime;
  });
}

export async function approvePartnerApplication(
  userId: string,
  actorUserId: string,
): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role !== "partner") {
    throw new Error("Only Talent Partner applications can be approved here");
  }
  if (user.registrationStatus !== "pending") {
    throw new Error("Application is not pending approval");
  }

  const updated = await updateUserRecord(userId, {
    status: "active",
    registrationStatus: "active",
    approvalDate: new Date().toISOString().slice(0, 10),
    approvedById: actorUserId,
    rejectedReason: null,
  });

  if (user.partnerId) {
    const partner = await findPartnerById(user.partnerId);
    if (partner) {
      const { ensurePartnerHasBusinessCode } = await import(
        "@/features/shared/services/business-ids.service"
      );
      const partnerCode = await ensurePartnerHasBusinessCode(partner);
      await updatePartner(user.partnerId, {
        status: "active",
        ...(partnerCode ? { partnerCode } : {}),
      });
    } else {
      await updatePartner(user.partnerId, { status: "active" });
    }
  }

  await safeActivity({
    entityType: "user",
    entityId: userId,
    action: "partner_approved",
    fromStatus: "pending",
    toStatus: "active",
    actorUserId,
    note: "Talent Partner approved — login enabled",
  });

  const loginUrl = `${appBaseUrl()}/sign-in`;
  await sendEmail({
    to: user.email,
    template: "approval",
    data: {
      name: user.fullName,
      loginUrl,
    },
  });
  await sendEmail({
    to: user.email,
    template: "account_activated",
    data: {
      name: user.fullName,
      loginUrl,
    },
  });

  const { notifyPartnerApproved } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyPartnerApproved({
    partnerUserId: userId,
    partnerName: user.fullName,
    loginUrl,
  });

  return updated;
}

export async function rejectPartnerApplication(
  userId: string,
  actorUserId: string,
  reason: string,
): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.registrationStatus !== "pending") {
    throw new Error("Application is not pending approval");
  }

  const updated = await updateUserRecord(userId, {
    status: "inactive",
    registrationStatus: "rejected",
    rejectedReason: reason,
  });

  if (user.partnerId) {
    await updatePartner(user.partnerId, { status: "inactive" });
  }

  await safeActivity({
    entityType: "user",
    entityId: userId,
    action: "partner_rejected",
    fromStatus: "pending",
    toStatus: "rejected",
    actorUserId,
    note: reason,
  });

  await sendEmail({
    to: user.email,
    template: "rejection",
    data: {
      name: user.fullName,
      reason,
    },
  });

  const { notifyPartnerRejected } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyPartnerRejected({ partnerUserId: userId, reason });

  return updated;
}

/**
 * Super Admin invites Admin or Account Manager.
 * Never creates Super Admin.
 */
export async function inviteStaffUser(
  input: InviteStaffInput,
  actorUserId: string,
): Promise<User> {
  if (input.role === ("super_admin" as UserRole)) {
    throw new Error("Cannot invite a Super Admin");
  }

  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const token = createInvitationToken();
  const expiry = await invitationExpiryDate();

  const user = await createUserRecord({
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    status: "inactive",
    registrationStatus: "invitation_pending",
    phone: input.phone || null,
    invitationToken: token,
    invitationExpiry: expiry,
  });

  const inviteUrl = `${appBaseUrl()}/invite/${token}`;

  await safeActivity({
    entityType: "user",
    entityId: user.id,
    action: "invitation_sent",
    toStatus: "invitation_pending",
    actorUserId,
    note: `Invited as ${getRoleLabel(input.role)}`,
  });

  await sendEmail({
    to: input.email,
    template: "invitation",
    data: {
      name: input.fullName,
      roleLabel: getRoleLabel(input.role),
      inviteUrl,
      expiresAt: new Date(expiry).toLocaleDateString(),
    },
  });
  await sendEmail({
    to: input.email,
    template: "password_setup",
    data: {
      name: input.fullName,
      inviteUrl,
    },
  });

  const { notifyInvitationSent } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyInvitationSent({
    userId: user.id,
    role: input.role,
    inviteUrl,
  });

  return user;
}

export async function acceptInvitation(
  token: string,
  clerkUserId: string,
): Promise<User> {
  const user = await findUserByInvitationToken(token);
  if (!user) {
    throw new Error("Invalid invitation token");
  }
  if (user.registrationStatus !== "invitation_pending") {
    throw new Error("Invitation is no longer valid");
  }
  if (
    user.invitationExpiry &&
    Date.parse(user.invitationExpiry) < Date.now()
  ) {
    throw new Error("Invitation has expired");
  }

  const updated = await updateUserRecord(user.id, {
    status: "active",
    registrationStatus: "active",
    clerkUserId,
    invitationToken: null,
    invitationExpiry: null,
  });

  await safeActivity({
    entityType: "user",
    entityId: user.id,
    action: "invitation_accepted",
    fromStatus: "invitation_pending",
    toStatus: "active",
    actorUserId: user.id,
    note: "Invitation accepted — account activated",
  });

  await sendEmail({
    to: user.email,
    template: "welcome",
    data: {
      name: user.fullName,
      loginUrl: `${appBaseUrl()}/sign-in`,
    },
  });

  const { notifyInvitationAccepted } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyInvitationAccepted({
    userId: user.id,
    userName: user.fullName,
    role: user.role,
  });

  return updated;
}

export async function changeUserRole(
  userId: string,
  toRole: UserRole,
  actorUserId: string,
): Promise<User> {
  if (toRole === "super_admin") {
    throw new Error("Cannot promote anyone to Super Admin");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role === "super_admin") {
    throw new Error("Cannot change Super Admin role");
  }
  if (user.role === toRole) {
    return user;
  }

  const updated = await updateUserRecord(userId, { role: toRole });

  await safeActivity({
    entityType: "user",
    entityId: userId,
    action: "role_changed",
    fromStatus: user.role,
    toStatus: toRole,
    actorUserId,
    note: `Role changed from ${getRoleLabel(user.role)} to ${getRoleLabel(toRole)}`,
  });

  const { notifyRoleChanged } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyRoleChanged({
    userId,
    userName: user.fullName,
    fromRole: user.role,
    toRole,
  });

  return updated;
}

export async function deactivateUser(
  userId: string,
  actorUserId: string,
): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role === "super_admin") {
    throw new Error("Cannot deactivate Super Admin");
  }

  const updated = await updateUserRecord(userId, {
    status: "inactive",
    registrationStatus: "inactive",
  });

  await safeActivity({
    entityType: "user",
    entityId: userId,
    action: "status_change",
    fromStatus: user.status,
    toStatus: "inactive",
    actorUserId,
    note: "User deactivated",
  });

  const { notifyUserDeactivated } = await import(
    "@/features/notifications/services/notification-events"
  );
  notifyUserDeactivated({ userId, userName: user.fullName });

  return updated;
}

export async function resetUserAccess(
  userId: string,
  actorUserId: string,
): Promise<User> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role === "super_admin") {
    throw new Error("Cannot reset Super Admin access");
  }

  const token = createInvitationToken();
  const expiry = await invitationExpiryDate();

  const updated = await updateUserRecord(userId, {
    status: "inactive",
    registrationStatus: "invitation_pending",
    clerkUserId: null,
    invitationToken: token,
    invitationExpiry: expiry,
  });

  const inviteUrl = `${appBaseUrl()}/invite/${token}`;

  await safeActivity({
    entityType: "user",
    entityId: userId,
    action: "invitation_sent",
    toStatus: "invitation_pending",
    actorUserId,
    note: "Access reset — new invitation issued",
  });

  await sendEmail({
    to: user.email,
    template: "password_setup",
    data: {
      name: user.fullName,
      inviteUrl,
    },
  });

  return updated;
}

export async function updatePartnerIdentityVisibility(
  partnerId: string,
  visibility: IdentityVisibility,
  actorUserId: string,
): Promise<void> {
  const partner = await findPartnerById(partnerId);
  if (!partner) {
    throw new Error("Partner not found");
  }

  const from = partner.identityVisibility;
  await updatePartner(partnerId, { identityVisibility: visibility });

  const users = await listUsers({ role: "partner" });
  const linked = users.find((u) => u.partnerId === partnerId);
  if (linked) {
    await updateUserRecord(linked.id, { identityVisibility: visibility });
    await safeActivity({
      entityType: "user",
      entityId: linked.id,
      action: "identity_visibility_changed",
      fromStatus: from,
      toStatus: visibility,
      actorUserId,
      note: `Identity visibility set to ${visibility.toUpperCase()}`,
    });
  }
}

export async function listManagedUsers(): Promise<UserListItem[]> {
  const users = await listUsers();
  const items: UserListItem[] = [];

  for (const user of users) {
    let partnerCode: string | null = null;
    let partnerName: string | null = null;
    if (user.partnerId) {
      const partner = await findPartnerById(user.partnerId);
      partnerCode = partner?.partnerCode ?? null;
      partnerName = partner?.contactName ?? partner?.companyName ?? null;
    }
    items.push({ ...user, partnerCode, partnerName });
  }

  return items;
}

export async function getUsersSummary(): Promise<UsersSummary> {
  const users = await listUsers();
  return {
    totalUsers: users.length,
    pendingApprovals: users.filter(
      (u) => u.role === "partner" && u.registrationStatus === "pending",
    ).length,
    invitationPending: users.filter(
      (u) => u.registrationStatus === "invitation_pending",
    ).length,
    activePartners: users.filter(
      (u) =>
        u.role === "partner" &&
        u.status === "active" &&
        u.registrationStatus === "active",
    ).length,
    admins: users.filter((u) => u.role === "admin").length,
    accountManagers: users.filter((u) => u.role === "account_manager").length,
  };
}

export async function getInvitationPreview(token: string): Promise<{
  fullName: string;
  email: string;
  role: UserRole;
  expired: boolean;
} | null> {
  const user = await findUserByInvitationToken(token);
  if (!user || user.registrationStatus !== "invitation_pending") {
    return null;
  }
  const expired = Boolean(
    user.invitationExpiry && Date.parse(user.invitationExpiry) < Date.now(),
  );
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    expired,
  };
}

export { APP_NAME };
