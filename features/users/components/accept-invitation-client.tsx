"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/features/users/actions";
import { getRoleLabel } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

interface AcceptInvitationClientProps {
  token: string;
  fullName: string;
  email: string;
  role: UserRole;
  expired: boolean;
}

export function AcceptInvitationClient({
  token,
  fullName,
  email,
  role,
  expired,
}: AcceptInvitationClientProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (expired) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Invitation expired
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask your Super Admin to reset access and send a new invitation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Accept invitation
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {fullName}. You are invited as{" "}
          <strong>{getRoleLabel(role)}</strong> ({email}).
        </p>
      </div>

      {!isSignedIn ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in with Google using <strong>{email}</strong>, then return here
            to activate access.
          </p>
          <GoogleSignInButton
            label="Sign in with Google"
            completeRedirectUrl={`/invite/${token}`}
          />
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await acceptInvitationAction(token);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Account activated");
              router.push("/auth/callback");
            });
          }}
        >
          {pending ? "Activating…" : "Activate account"}
        </Button>
      )}
    </div>
  );
}
