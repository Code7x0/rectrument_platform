import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isProtectedRoute } from "@/lib/clerk/routes";

/**
 * Middleware authenticates only.
 * Role authorization is enforced in server layouts / route handlers.
 */
export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request.nextUrl.pathname)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
