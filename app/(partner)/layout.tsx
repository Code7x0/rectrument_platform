import { RoleLayout } from "@/components/layout/role-layout";

export const dynamic = "force-dynamic";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="partner">{children}</RoleLayout>;
}
