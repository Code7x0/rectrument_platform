type ClerkErrorShape = {
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  message?: string;
};

function clerkErrorParts(error: unknown): ClerkErrorShape {
  if (!error || typeof error !== "object") {
    return {};
  }
  return error as ClerkErrorShape;
}

export function clerkErrorMessage(
  error: unknown,
  fallback = "Unable to sign in with email. Try again.",
): string {
  const err = clerkErrorParts(error);
  const first = err.errors?.[0];
  const detail =
    first?.longMessage || first?.message || err.message || first?.code;
  if (detail?.trim()) {
    return detail.trim();
  }
  return fallback;
}

export function clerkErrorCode(error: unknown): string | null {
  const first = clerkErrorParts(error).errors?.[0];
  return first?.code?.trim() || null;
}

export function isMissingClerkAccountError(error: unknown): boolean {
  const err = clerkErrorParts(error);
  const first = err.errors?.[0];
  const text = [
    first?.code,
    first?.message,
    first?.longMessage,
    err.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    first?.code === "form_identifier_not_found" ||
    text.includes("couldn't find your account") ||
    text.includes("could not find your account")
  );
}

export function isExistingClerkAccountError(error: unknown): boolean {
  const code = clerkErrorCode(error)?.toLowerCase() ?? "";
  const text = clerkErrorMessage(error, "").toLowerCase();
  return (
    code === "form_identifier_exists" ||
    code === "identifier_already_signed_in" ||
    text.includes("already exists") ||
    text.includes("already been taken")
  );
}

export function isSignUpRestrictedError(error: unknown): boolean {
  const code = clerkErrorCode(error)?.toLowerCase() ?? "";
  const text = clerkErrorMessage(error, "").toLowerCase();
  return (
    code.includes("sign_up") ||
    code.includes("not_allowed") ||
    text.includes("sign up") ||
    text.includes("sign-up") ||
    text.includes("not allowed")
  );
}
