import { RoleLayout } from "@/components/layout/role-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role={["admin", "super_admin"]}>{children}</RoleLayout>
  );
}
