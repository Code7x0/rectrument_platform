import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { LandingPage } from "@/features/landing/components/landing-page";
import { getAppSession, getDashboardRouteForRole } from "@/lib/auth";
import { rethrowNextControlFlow } from "@/lib/actions/errors";
import { ROUTES } from "@/lib/constants";

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

  return <LandingPage />;
}
