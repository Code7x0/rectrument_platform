import { SignOutButton } from "@clerk/nextjs";

import {
  AuthMessage,
  AuthPageShell,
  AuthPrimaryLink,
} from "@/components/shared/auth-message";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Unauthorized",
};

const REASON_COPY: Record<
  string,
  { title: string; description: string }
> = {
  pending: {
    title: "Approval pending",
    description:
      "Your Talent Partner application is still pending approval. Once an Admin sets your Partners Status to Active, sign in again with the same email used at registration (Official Email ID in Airtable).",
  },
  rejected: {
    title: "Application rejected",
    description:
      "Your Talent Partner application was rejected. Contact the Administrator if you believe this is a mistake.",
  },
  inactive: {
    title: "Account inactive",
    description:
      "Your Airtable partner/staff record is not Active. Ask an Admin to set Partners → Status = Active (or Account Managers → Active), then sign in again.",
  },
  not_found: {
    title: "Account not found",
    description:
      "No Airtable identity matches your sign-in email. For Talent Partners, Official Email ID on the Partners row must exactly match your Clerk email. For Admin/SA, your email must be in AIRTABLE_SUPER_ADMIN_EMAILS / AIRTABLE_ADMIN_EMAILS.",
  },
  error: {
    title: "Sign-in error",
    description:
      "We could not load your account from Airtable. Try again in a moment. If it continues, check Official Email ID and Partners Status = Active.",
  },
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason?.trim() || "not_found";
  const copy = REASON_COPY[reason] ?? {
    title: "Account not configured",
    description:
      "Your account has not been configured. Please contact the Administrator.",
  };

  return (
    <AuthPageShell>
      <AuthMessage
        title={copy.title}
        description={copy.description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <AuthPrimaryLink href="/sign-in">Back to sign in</AuthPrimaryLink>
            <SignOutButton>
              <Button variant="outline">Sign out</Button>
            </SignOutButton>
          </div>
        }
      />
    </AuthPageShell>
  );
}
