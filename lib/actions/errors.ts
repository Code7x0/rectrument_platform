import { isRedirectError } from "next/dist/client/components/redirect-error";

import { toUserFacingAirtableMessage } from "@/lib/airtable/errors";

/**
 * Re-throw Next.js redirect/notFound so action try/catch never swallows them.
 */
export function rethrowNextControlFlow(error: unknown): void {
  if (isRedirectError(error)) {
    throw error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  ) {
    throw error;
  }
}

/**
 * Map caught errors to a toast-safe message. Never returns raw stacks.
 */
export function actionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  rethrowNextControlFlow(error);

  const friendly = toUserFacingAirtableMessage(error);
  if (friendly !== "Something went wrong loading data. Please try again.") {
    return friendly;
  }

  if (error instanceof Error && error.message.trim()) {
    // Domain validation messages (e.g. "Job not found") — keep short, no stacks.
    const msg = error.message.replace(/\n[\s\S]*$/, "").slice(0, 200);
    if (
      msg.includes("Airtable") ||
      msg.includes("UNKNOWN_ERROR") ||
      msg.includes("INVALID_PERMISSIONS") ||
      /status code/i.test(msg)
    ) {
      return fallback;
    }
    return msg;
  }

  return fallback;
}
