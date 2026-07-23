import { ClientSignIn } from "@/components/auth/client-clerk-auth";
import { AuthPageShell } from "@/components/shared/auth-message";
import { APP_NAME } from "@/lib/constants";

export default function SignInPage() {
  return (
    <AuthPageShell>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your company account
        </p>
      </div>
      <div className="flex justify-center">
        <ClientSignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/auth/callback"
          signUpUrl="/sign-in"
        />
      </div>
    </AuthPageShell>
  );
}
