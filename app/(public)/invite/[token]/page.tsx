import { notFound } from "next/navigation";

import { AcceptInvitationClient } from "@/features/users/components";
import { getInvitationPreview } from "@/features/users/services";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);
  if (!preview) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <AcceptInvitationClient
        token={token}
        fullName={preview.fullName}
        email={preview.email}
        role={preview.role}
        expired={preview.expired}
      />
    </main>
  );
}
