import type { UserRole } from "@/types";

/** AM job-assignment emails fire only when Admin/Super Admin assign the job. */
export function shouldNotifyAccountManagerJobAssignment(
  actorRole?: UserRole | null,
): boolean {
  return actorRole === "admin" || actorRole === "super_admin";
}
