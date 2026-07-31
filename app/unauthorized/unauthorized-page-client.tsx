"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

import {
  AuthMessage,
  AuthPageShell,
  AuthPrimaryLink,
} from "@/components/shared/auth-message";
import { Button } from "@/components/ui/button";

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
      "No Airtable identity matches your sign-in email. For Talent Partners, Official Email ID or Personal Email on the Partners row must match your Google email (same spelling). For Admin/SA, your email must be in AIRTABLE_SUPER_ADMIN_EMAILS / AIRTABLE_ADMIN_EMAILS. Sign out, then sign in again with the matching Google account.",
  },
  error: {
    title: "Sign-in error",
    description:
      "We could not load your account from Airtable. Try again in a moment. If it continues, check Official Email ID and Partners Status = Active.",
  },
};

export function UnauthorizedPageClient({ reason }: { reason: string }) {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);
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
            <Button
              type="button"
              variant="default"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void signOut({ redirectUrl: "/sign-in" }).finally(() => {
                  setPending(false);
                });
              }}
            >
              {pending ? "Signing out…" : "Sign out & try another account"}
            </Button>
            <AuthPrimaryLink href="/sign-in" variant="outline">
              Back to sign in
            </AuthPrimaryLink>
          </div>
        }
      />
    </AuthPageShell>
  );
}
