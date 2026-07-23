import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { ClientSignInButton } from "@/components/auth/client-clerk-auth";
import { Button } from "@/components/ui/button";
import { getAppSession, getDashboardRouteForRole } from "@/lib/auth";
import { rethrowNextControlFlow } from "@/lib/actions/errors";
import { APP_NAME, ROUTES } from "@/lib/constants";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    try {
      const session = await getAppSession();
      if (session && session.status === "active") {
        redirect(getDashboardRouteForRole(session.role));
      }
      redirect(ROUTES.unauthorized);
    } catch (error) {
      rethrowNextControlFlow(error);
      redirect(ROUTES.unauthorized);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E2E8F0_0%,_transparent_55%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium tracking-[0.2em] text-[#64748B] uppercase">
          Recruitment Partner Platform
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-4 max-w-xl text-base text-[#64748B]">
          Operate the full recruitment lifecycle — from Talent Partner
          onboarding to placements and payouts — with clear roles and
          transparent status.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ClientSignInButton
            mode="redirect"
            forceRedirectUrl={ROUTES.authCallback}
          >
            <Button size="lg">Sign in</Button>
          </ClientSignInButton>
          <Button asChild size="lg" variant="outline">
            <Link href={ROUTES.register}>Become a Talent Partner</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-[#94A3B8]">
          Staff access is by invitation. Talent Partners register publicly and
          wait for Admin approval before login is enabled.
        </p>
      </div>
    </main>
  );
}
