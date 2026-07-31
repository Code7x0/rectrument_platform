"use client";

import Link from "next/link";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthPageShell } from "@/components/shared/auth-message";
import { Button } from "@/components/ui/button";
import { APP_NAME, ROUTES } from "@/lib/constants";

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
        <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your Google account
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
        <GoogleSignInButton />
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Talent Partners?{" "}
        <Link
          href={ROUTES.register}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Register here
        </Link>
        , then sign in after Admin approval. Use the same Google email as your
        Official Email ID (or Personal Email) in Airtable.
      </p>
    </AuthPageShell>
  );
}
