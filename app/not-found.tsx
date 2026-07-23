import {
  AuthMessage,
  AuthPageShell,
  AuthPrimaryLink,
} from "@/components/shared/auth-message";

export default function NotFound() {
  return (
    <AuthPageShell>
      <AuthMessage
        title="Page not found"
        description="The page you are looking for does not exist."
        action={<AuthPrimaryLink href="/">Go home</AuthPrimaryLink>}
      />
    </AuthPageShell>
  );
}
