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
  updateLastLogin,
} from "@/services/users.service";
import type { AppSession, Permission, UserRole } from "@/types";

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
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  const session = await buildAppSession({
    clerkUserId: userId,
    email,
  });

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
    redirect("/unauthorized");
  }

  if (session.status !== "active") {
    redirect("/unauthorized");
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

export {
  getDashboardRouteForRole,
  getPermissionsForRole,
  getRequiredRoleForPath,
  getRoleLabel,
  hasPermission,
  roleHasPermission,
  ROLE_PERMISSIONS,
} from "@/lib/auth/permissions";
