import { RoleLayout } from "@/components/layout/role-layout";

export const dynamic = "force-dynamic";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="super_admin">{children}</RoleLayout>;
}
