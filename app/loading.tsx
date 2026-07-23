import {
  AuthMessage,
  AuthPageShell,
} from "@/components/shared/auth-message";

export default function Loading() {
  return (
    <AuthPageShell>
      <AuthMessage
        title="Loading"
        description="Please wait while we prepare your session."
      />
    </AuthPageShell>
  );
}
