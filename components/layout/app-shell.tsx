import type { ReactNode } from "react";

/**
 * @deprecated Prefer DashboardShell / RoleLayout.
 * Kept temporarily for import safety during migration.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
