import { SignOutButton } from "@clerk/nextjs";

import {
  AuthMessage,
  AuthPageShell,
  AuthPrimaryLink,
} from "@/components/shared/auth-message";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <AuthPageShell>
      <AuthMessage
        title="Account not configured"
        description="Your account has not been configured. Please contact the Administrator."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <AuthPrimaryLink href="/sign-in">Back to sign in</AuthPrimaryLink>
            <SignOutButton>
              <Button variant="outline">Sign out</Button>
            </SignOutButton>
          </div>
        }
      />
    </AuthPageShell>
  );
}
