import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { DocumentsReviewPageClient } from "@/features/partner-documents/components";
import { listDocuments } from "@/features/partner-documents/services";

export default async function AdminDocumentsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "view_documents")) {
    redirect("/forbidden");
  }

  const documents = await listDocuments();

  return (
    <DocumentsReviewPageClient
      documents={documents}
      canVerify={roleHasPermission(session.role, "verify_documents")}
      canArchive={roleHasPermission(session.role, "archive_documents")}
      title="Partner Documents"
      description="Review and verify partner KYC and compliance documents."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Partner Documents" },
      ]}
    />
  );
}
