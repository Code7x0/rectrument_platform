import type { Permission, UserRole } from "@/types";

/**
 * Role → permissions map (application authorization layer).
 * Permissions are never read from Airtable.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  super_admin: [
    "view_dashboard",
    "manage_users",
    "invite_staff",
    "manage_roles",
    "approve_partners",
    "manage_identity_visibility",
    "manage_company_settings",
    "manage_clients",
    "archive_clients",
    "view_jobs",
    "manage_jobs",
    "manage_partners",
    "archive_partners",
    "view_allocations",
    "view_submissions",
    "view_documents",
    "verify_documents",
    "archive_documents",
    "view_payouts",
    "manage_payouts",
    "view_own_notifications",
    "manage_own_notification_preferences",
  ],
  admin: [
    "view_dashboard",
    "approve_partners",
    "manage_identity_visibility",
    "manage_clients",
    "archive_clients",
    "view_jobs",
    "manage_jobs",
    "manage_partners",
    "archive_partners",
    "view_allocations",
    "view_submissions",
    "view_documents",
    "verify_documents",
    "archive_documents",
    "view_payouts",
    "manage_payouts",
    "view_own_notifications",
    "manage_own_notification_preferences",
  ],
  account_manager: [
    "view_dashboard",
    "manage_clients",
    "view_jobs",
    "view_allocations",
    "manage_allocations",
    "archive_allocations",
    "review_candidates",
    "view_submissions",
    "view_payouts",
    "update_payouts",
    "view_own_notifications",
    "manage_own_notification_preferences",
  ],
  partner: [
    "view_dashboard",
    "view_own_allocations",
    "submit_candidates",
    "manage_own_documents",
    "view_own_payouts",
    "view_own_notifications",
    "manage_own_notification_preferences",
  ],
} as const;

export type RolePermissionMap = typeof ROLE_PERMISSIONS;

export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasPermission(
  permissions: Permission[],
  permission: Permission,
): boolean {
  return permissions.includes(permission);
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isAccountManager(role: UserRole | null | undefined): boolean {
  return role === "account_manager";
}

export function isPartner(role: UserRole | null | undefined): boolean {
  return role === "partner";
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "account_manager":
      return "Account Manager";
    case "partner":
      return "Talent Partner";
  }
}

export function getDashboardRouteForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "admin":
      return "/admin";
    case "account_manager":
      return "/account-manager";
    case "partner":
      return "/partner";
  }
}

export function getRequiredRoleForPath(pathname: string): UserRole | null {
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return "super_admin";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }
  if (
    pathname === "/account-manager" ||
    pathname.startsWith("/account-manager/")
  ) {
    return "account_manager";
  }
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    return "partner";
  }
  return null;
}
