"use client";

import dynamic from "next/dynamic";
import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

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

const UserButtonLazy = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false },
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

/**
 * UserButton portals into the document body. Mount only after hydration so
 * React 19 deletion effects do not hit a null parent (blank white page).
 */
export function ClientUserButton(
  props: ComponentProps<typeof UserButtonLazy>,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-block h-9 w-9 shrink-0 rounded-full bg-[#E2E8F0]"
        aria-hidden
      />
    );
  }

  return <UserButtonLazy {...props} />;
}
