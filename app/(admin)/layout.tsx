import { RoleLayout } from "@/components/layout/role-layout";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role={["admin", "super_admin"]}>{children}</RoleLayout>
  );
}
