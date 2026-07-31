"use client";

import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  /** Where to land after Google OAuth completes. */
  completeRedirectUrl?: string;
  className?: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function clerkErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unable to start Google sign-in. Try again.";
  }
  const err = error as {
    errors?: Array<{ longMessage?: string; message?: string; code?: string }>;
    message?: string;
  };
  const first = err.errors?.[0];
  const detail =
    first?.longMessage || first?.message || err.message || first?.code;
  if (detail?.trim()) {
    return detail.trim();
  }
  return "Unable to start Google sign-in. Try again.";
}

/**
 * Google-only sign-in — email/password is not offered in the product UI.
 * Enable Google OAuth in the Clerk dashboard for this to work.
 *
 * If a Clerk session already exists (e.g. after /unauthorized), continue to
 * the app callback instead of starting a second OAuth (which throws).
 */
export function GoogleSignInButton({
  completeRedirectUrl = ROUTES.authCallback,
  className,
  label = "Continue with Google",
  size = "lg",
  variant = "default",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { signOut } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const [pending, setPending] = useState(false);

  const ready = authLoaded && signInLoaded;

  async function startGoogleOAuth() {
    if (!signIn) {
      throw new Error(
        "Sign-in is not ready. Refresh the page, or sign out and try again.",
      );
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: `${origin}/sign-in/sso-callback`,
      redirectUrlComplete: completeRedirectUrl.startsWith("http")
        ? completeRedirectUrl
        : `${origin}${completeRedirectUrl}`,
      oidcPrompt: "select_account",
    });
  }

  async function handleClick() {
    if (!ready || pending) {
      return;
    }

    setPending(true);
    try {
      // Stuck Clerk session after /unauthorized — finish app routing, don't
      // start a second OAuth (Clerk throws and shows the red toast).
      if (isSignedIn) {
        router.replace(completeRedirectUrl);
        return;
      }

      await startGoogleOAuth();
    } catch (error) {
      console.error("[auth] Google sign-in failed", error);
      const message = clerkErrorMessage(error).toLowerCase();
      const sessionConflict =
        message.includes("already signed") ||
        message.includes("session") ||
        message.includes("signed in");

      if (sessionConflict || isSignedIn) {
        try {
          await signOut({ redirectUrl: "/sign-in" });
          toast.message("Signed out. Click Continue with Google again.");
        } catch (signOutError) {
          console.error("[auth] sign-out after OAuth failure", signOutError);
          toast.error(clerkErrorMessage(error));
        }
        setPending(false);
        return;
      }

      toast.error(clerkErrorMessage(error));
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("w-full gap-2", className)}
      disabled={!ready || pending}
      onClick={() => void handleClick()}
    >
      <GoogleGlyph className="h-4 w-4" />
      {pending
        ? isSignedIn
          ? "Continuing…"
          : "Redirecting…"
        : isSignedIn
          ? "Continue to app"
          : label}
    </Button>
  );
}
