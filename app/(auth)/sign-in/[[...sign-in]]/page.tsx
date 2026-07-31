import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthPageShell } from "@/components/shared/auth-message";
import { APP_NAME, ROUTES } from "@/lib/constants";

export default function SignInPage() {
  return (
    <AuthPageShell>
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your Google account
        </p>
      </div>

      <GoogleSignInButton />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Talent Partners?{" "}
        <Link
          href={ROUTES.register}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Register here
        </Link>
        , then sign in after Admin approval.
      </p>
    </AuthPageShell>
  );
}
