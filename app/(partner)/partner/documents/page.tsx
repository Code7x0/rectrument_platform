import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerDocumentsPageClient } from "@/features/partner-documents/components";
import {
  normalizePartnerDocumentsForPortal,
  summarizePartnerPortalDocuments,
} from "@/features/partner-documents/lib/partner-portal-documents";
import {
  buildDocumentSlots,
  listDocumentsForPartner,
} from "@/features/partner-documents/services";
import { getPartnerById } from "@/features/partners/services";

export default async function PartnerDocumentsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_own_documents")) {
    redirect("/forbidden");
  }
  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const [partner, rawDocuments] = await Promise.all([
    getPartnerById(session.partnerId),
    listDocumentsForPartner(session.partnerId),
  ]);
  const documents = normalizePartnerDocumentsForPortal(
    rawDocuments,
    partner?.status ?? "pending",
  );
  const slots = buildDocumentSlots(documents);
  const summary = summarizePartnerPortalDocuments(documents);

  return (
    <PartnerDocumentsPageClient
      slots={slots}
      summary={summary}
      canUpload
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "Documents" },
      ]}
    />
  );
}
