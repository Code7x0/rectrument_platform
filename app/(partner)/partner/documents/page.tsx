import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { PartnerDocumentsPageClient } from "@/features/partner-documents/components";
import {
  buildDocumentSlots,
  listDocumentsForPartner,
  summarizeDocuments,
} from "@/features/partner-documents/services";

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

  const documents = await listDocumentsForPartner(session.partnerId);
  const slots = buildDocumentSlots(documents);
  const summary = summarizeDocuments(documents);

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
