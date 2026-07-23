"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

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
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#0F172A]">
          Invitation expired
        </h1>
        <p className="text-sm text-[#64748B]">
          Ask your Super Admin to reset access and send a new invitation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-[#0F172A]">
          Accept invitation
        </h1>
        <p className="text-sm text-[#64748B]">
          Welcome, {fullName}. You are invited as{" "}
          <strong>{getRoleLabel(role)}</strong> ({email}).
        </p>
      </div>

      {!isSignedIn ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-[#475569]">
            Create or sign in to your Clerk account using <strong>{email}</strong>,
            then return here to activate access.
          </p>
          <SignInButton mode="redirect" forceRedirectUrl={`/invite/${token}`}>
            <Button className="w-full">Sign in to continue</Button>
          </SignInButton>
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
