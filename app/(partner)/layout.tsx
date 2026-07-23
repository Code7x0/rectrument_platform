import { RoleLayout } from "@/components/layout/role-layout";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="partner">{children}</RoleLayout>;
}
