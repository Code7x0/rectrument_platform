/**
 * Clerk-related public route and redirect defaults.
 * Prefer configuring these via environment variables in production.
 */
export const CLERK_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-in",
  afterSignIn: "/auth/callback",
  afterSignUp: "/sign-in",
} as const;
