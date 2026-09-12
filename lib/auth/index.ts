import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  getDashboardRouteForRole,
  getRequiredRoleForPath,
  isAccountManager as checkAccountManager,
  isAdmin as checkAdmin,
  isPartner as checkPartner,
  isSuperAdmin as checkSuperAdmin,
  roleHasPermission,
} from "@/lib/auth/permissions";
import {
  buildAppSession,
  canUserAuthenticate,
  getCurrentUser,
  updateLastLogin,
} from "@/services/users.service";
import type { AppSession, Permission, UserRole } from "@/types";

function clerkEmails(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): string[] {
  const emails = user.emailAddresses
    .map((row) => row.emailAddress?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const primary = user.primaryEmailAddress?.emailAddress
    ?.trim()
    .toLowerCase();
  if (primary && !emails.includes(primary)) {
    emails.unshift(primary);
  }
  return [...new Set(emails)];
}

async function redirectUnauthorizedWithReason(
  clerkUserId: string,
): Promise<never> {
  const clerkUser = await currentUser();
  const emails = clerkUser ? clerkEmails(clerkUser) : [];

  for (const email of emails) {
    const user = await getCurrentUser(clerkUserId, email);
    if (!user) {
      continue;
    }
    if (
      user.registrationStatus === "pending" ||
      user.registrationStatus === "invitation_pending"
    ) {
      redirect("/unauthorized?reason=pending");
    }
    if (user.registrationStatus === "rejected") {
      redirect("/unauthorized?reason=rejected");
    }
    if (!canUserAuthenticate(user)) {
      redirect("/unauthorized?reason=inactive");
    }
    redirect("/unauthorized?reason=error");
  }

  redirect(
    emails.length > 0
      ? "/unauthorized?reason=not_found"
      : "/unauthorized?reason=error",
  );
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "unauthenticated" | "unauthorized" | "forbidden",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Request-scoped session resolution (memoized with React cache).
 * Clerk authenticates → Airtable identity lookup → lightweight AppSession.
 * Permissions are derived from role when needed — not stored on session.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const emails = [
    clerkUser.primaryEmailAddress?.emailAddress,
    ...clerkUser.emailAddresses.map((row) => row.emailAddress),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const uniqueEmails = [...new Set(emails)];

  if (uniqueEmails.length === 0) {
    return null;
  }

  let session: AppSession | null = null;
  for (const email of uniqueEmails) {
    session = await buildAppSession({
      clerkUserId: userId,
      email,
    });
    if (session) {
      break;
    }
  }

  if (session && session.status === "active") {
    void updateLastLogin(session.userId).catch(() => undefined);
  }

  return session;
});

export async function requireAuth(): Promise<AppSession> {
  const { userId } = await auth();

  if (!userId) {
    await auth.protect();
    throw new AuthError("Not authenticated", "unauthenticated");
  }

  const session = await getAppSession();

  if (!session) {
    return await redirectUnauthorizedWithReason(userId);
  }

  if (session.status !== "active") {
    redirect("/unauthorized?reason=inactive");
  }

  return session;
}

export async function requireRole(
  allowed: UserRole | UserRole[],
): Promise<AppSession> {
  const session = await requireAuth();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!roles.includes(session.role)) {
    redirect("/forbidden");
  }

  return session;
}

export async function requirePermission(
  permission: Permission,
): Promise<AppSession> {
  const session = await requireAuth();

  if (!roleHasPermission(session.role, permission)) {
    redirect("/forbidden");
  }

  return session;
}

export async function requirePathRole(pathname: string): Promise<AppSession> {
  const requiredRole = getRequiredRoleForPath(pathname);
  if (!requiredRole) {
    return requireAuth();
  }
  return requireRole(requiredRole);
}

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export function redirectToRoleDashboard(role: UserRole): never {
  redirect(getDashboardRouteForRole(role));
}

export function isAdmin(session: AppSession | null | undefined): boolean {
  return checkAdmin(session?.role);
}

export function isSuperAdmin(session: AppSession | null | undefined): boolean {
  return checkSuperAdmin(session?.role);
}

export function isAccountManager(
  session: AppSession | null | undefined,
): boolean {
  return checkAccountManager(session?.role);
}

export function isPartner(session: AppSession | null | undefined): boolean {
  return checkPartner(session?.role);
}

/**
 * Canonical Account Manager Airtable record id for scoping.
 * In client-identity mode userId === accountManagerId; prefer the dedicated field.
 */
export function resolveAccountManagerScopeId(
  session: AppSession | null | undefined,
): string | null {
  if (!session) {
    return null;
  }
  return session.accountManagerId ?? (session.role === "account_manager" ? session.userId : null);
}

/**
 * Canonical Partner Airtable record id for scoping.
 */
export function resolvePartnerScopeId(
  session: AppSession | null | undefined,
): string | null {
  if (!session) {
    return null;
  }
  return session.partnerId ?? (session.role === "partner" ? session.userId : null);
}

export {
  getDashboardRouteForRole,
  getPermissionsForRole,
  getRequiredRoleForPath,
  getRoleLabel,
  hasPermission,
  roleHasPermission,
  ROLE_PERMISSIONS,
} from "@/lib/auth/permissions";
