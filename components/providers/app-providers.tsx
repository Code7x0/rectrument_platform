"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { CurrentUserProvider } from "@/providers/current-user-provider";
import type { AppSession } from "@/types";

interface AppProvidersProps {
  children: ReactNode;
  session?: AppSession | null;
}

export function AppProviders({
  children,
  session = null,
}: AppProvidersProps) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      signInFallbackRedirectUrl="/auth/callback"
      signUpFallbackRedirectUrl="/sign-in"
    >
      <QueryProvider>
        <CurrentUserProvider session={session}>
          {children}
          <ToasterProvider />
        </CurrentUserProvider>
      </QueryProvider>
    </ClerkProvider>
  );
}
