import { RoleLayout } from "@/components/layout/role-layout";

export const dynamic = "force-dynamic";

export default function AccountManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="account_manager">{children}</RoleLayout>;
}
