import type { AppSession, UserRole } from "@/types";
import type { SearchEntityType } from "@/features/search/types";

export function roleBasePath(role: UserRole): {
  clients: string;
  jobs: string;
  partners: string;
  candidates: string;
  allocations: string;
  documents: string;
  payouts: string;
  users: string;
} {
  switch (role) {
    case "super_admin":
      return {
        clients: "/admin/clients",
        jobs: "/admin/jobs",
        partners: "/admin/partners",
        candidates: "/admin/candidates",
        allocations: "/admin/allocations",
        documents: "/admin/documents",
        payouts: "/admin/payouts",
        users: "/super-admin/users",
      };
    case "admin":
      return {
        clients: "/admin/clients",
        jobs: "/admin/jobs",
        partners: "/admin/partners",
        candidates: "/admin/candidates",
        allocations: "/admin/allocations",
        documents: "/admin/documents",
        payouts: "/admin/payouts",
        users: "/admin/approvals",
      };
    case "account_manager":
      return {
        clients: "/account-manager/clients",
        jobs: "/account-manager/jobs",
        partners: "/account-manager/allocations",
        candidates: "/account-manager/candidates",
        allocations: "/account-manager/allocations",
        documents: "/account-manager/documents",
        payouts: "/account-manager/payouts",
        users: "/account-manager",
      };
    case "partner":
      return {
        clients: "/partner",
        jobs: "/partner/jobs",
        partners: "/partner/profile",
        candidates: "/partner/candidates",
        allocations: "/partner/jobs",
        documents: "/partner/documents",
        payouts: "/partner/payments",
        users: "/partner/profile",
      };
  }
}

export function entityUrl(
  session: AppSession,
  entityType: SearchEntityType,
  entityId: string,
): string {
  const paths = roleBasePath(session.role);

  switch (entityType) {
    case "client":
      return `${paths.clients}/${entityId}`;
    case "partner":
      return session.role === "admin" || session.role === "super_admin"
        ? `${paths.partners}/${entityId}`
        : paths.partners;
    case "job":
      return `${paths.jobs}?jobId=${entityId}`;
    case "allocation":
      return `${paths.allocations}?allocationId=${entityId}`;
    case "submission":
    case "candidate":
      return `${paths.candidates}?id=${entityId}`;
    case "document":
      return `${paths.documents}?documentId=${entityId}`;
    case "payout":
      return `${paths.payouts}?payoutId=${entityId}`;
    case "user":
    case "account_manager":
      return paths.users;
    case "notification":
      return "/notifications";
    case "activity":
      return "/activities";
    case "settings":
      return entityId.startsWith("/") ? entityId : `/settings/${entityId}`;
    default:
      return "/";
  }
}
