import {
  AuthMessage,
  AuthPageShell,
  AuthPrimaryLink,
} from "@/components/shared/auth-message";

export const metadata = {
  title: "Forbidden",
};

export default function ForbiddenPage() {
  return (
    <AuthPageShell>
      <AuthMessage
        title="Access denied"
        description="You do not have permission to view this page."
        action={<AuthPrimaryLink href="/auth/callback">Go to my dashboard</AuthPrimaryLink>}
      />
    </AuthPageShell>
  );
}
