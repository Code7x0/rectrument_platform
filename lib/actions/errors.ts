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

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.replace(/\n[\s\S]*$/, "").slice(0, 240);

    // Prefer AirtableOperationError detail via toUserFacingAirtableMessage.
    const friendly = toUserFacingAirtableMessage(error);
    if (
      friendly !== "Something went wrong loading data. Please try again." &&
      !friendly.startsWith("Unable to save or load data right now")
    ) {
      return friendly;
    }

    // Domain validation / explicit Error messages — keep short, no stacks.
    if (
      msg.includes("UNKNOWN_ERROR") ||
      /status code/i.test(msg)
    ) {
      return fallback;
    }
    if (msg.startsWith("Unable to ") || msg.length > 0) {
      // AirtableOperationError messages start with "Unable to list/create/update…"
      if (error.name === "AirtableOperationError" || msg.startsWith("Unable to ")) {
        return msg;
      }
      return msg;
    }
  }

  const friendly = toUserFacingAirtableMessage(error);
  if (friendly !== "Something went wrong loading data. Please try again.") {
    return friendly;
  }

  return fallback;
}
