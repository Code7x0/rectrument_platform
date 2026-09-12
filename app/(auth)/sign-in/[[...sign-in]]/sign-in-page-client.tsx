"use client";

import Link from "next/link";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailOtpSignIn } from "@/components/auth/email-otp-sign-in";
import { Input } from "@/components/ui/input";
import { AuthPageShell } from "@/components/shared/auth-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

function SignInMethods() {
  const [email, setEmail] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Work email (Official or Personal Email in Airtable)"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter the email your Admin added in Airtable, or the one you registered
          with. We sync it automatically on sign-in.
        </p>
      </div>
      <GoogleSignInButton emailHint={email} />
      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="bg-background px-2">or</span>
        <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
      </div>
      <EmailOtpSignIn email={email} onEmailChange={setEmail} />
    </div>
  );
}

/**
 * Sign-in surface that recovers from a stuck Clerk session (signed into Clerk
 * but rejected by Airtable identity), which previously made Google OAuth fail.
 */
export function SignInPageClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    // Soft continue — auth/callback will route or show unauthorized with reason.
  }, [isLoaded, isSignedIn]);

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  return (
    <AuthPageShell>
      <div className="mb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in with Google or email one-time code
        </p>
      </div>

      {isLoaded && isSignedIn ? (
        <div className="mb-4 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm">
          <p className="text-[#0F172A]">
            You&apos;re signed into Google
            {email ? (
              <>
                {" "}
                as <span className="font-medium">{email}</span>
              </>
            ) : null}
            . Continue to open the app, or switch account.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => router.replace(ROUTES.authCallback)}
            >
              Continue to app
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut({ redirectUrl: "/sign-in" }).finally(() => {
                  setSigningOut(false);
                });
              }}
            >
              {signingOut ? "Signing out…" : "Use a different Google account"}
            </Button>
          </div>
        </div>
      ) : (
        <SignInMethods />
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Talent Partners can{" "}
        <Link
          href={ROUTES.register}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          register here
        </Link>
        , or ask an Admin to add you directly in Airtable. Sign in with the same
        Official Email ID or Personal Email once Status is Active — Google or email
        code both work.
      </p>
    </AuthPageShell>
  );
}
