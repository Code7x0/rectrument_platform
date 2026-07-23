"use client";

import dynamic from "next/dynamic";
import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import type { ComponentProps, ReactNode } from "react";

import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

/**
 * Clerk SignIn must mount client-side only on production hosts.
 * SSR + bot-protection (Cloudflare Turnstile) can change hook counts
 * between server/client renders → React #310 ("Rendered more hooks…").
 */
const SignInLazy = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignIn),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] w-full max-w-sm items-center justify-center">
        <LoadingSkeleton rows={4} />
      </div>
    ),
  },
);

export function ClientSignIn(
  props: ComponentProps<typeof SignInLazy>,
) {
  return <SignInLazy {...props} />;
}

export function ClientSignInButton({
  children,
  ...props
}: ComponentProps<typeof ClerkSignInButton> & { children: ReactNode }) {
  return <ClerkSignInButton {...props}>{children}</ClerkSignInButton>;
}
