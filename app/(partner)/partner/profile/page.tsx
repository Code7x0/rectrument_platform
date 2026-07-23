import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { getAppSession } from "@/lib/auth";
import { PartnerProfileForm } from "@/features/partners/components/partner-profile-form";
import { getPartnerById } from "@/features/partners/services";

export default async function PartnerProfilePage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "partner") {
    redirect("/forbidden");
  }
  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const partner = await getPartnerById(session.partnerId);
  if (!partner) {
    notFound();
  }

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "Profile" },
        ]}
      />
      <PageHeader
        title="Profile"
        description="Update your company and contact details. Status and verification are managed by Admin."
      />
      <PartnerProfileForm partner={partner} />
    </ContentContainer>
  );
}
