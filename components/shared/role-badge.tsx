import { getRoleLabel } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {getRoleLabel(role)}
    </Badge>
  );
}
