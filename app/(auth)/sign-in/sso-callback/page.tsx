import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/shared/auth-message";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

/**
 * Completes the Google OAuth redirect started by GoogleSignInButton.
 */
export default function SignInSsoCallbackPage() {
  return (
    <AuthPageShell>
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Finishing Google sign-in…</p>
        <LoadingSkeleton rows={3} />
      </div>
      <AuthenticateWithRedirectCallback />
    </AuthPageShell>
  );
}
