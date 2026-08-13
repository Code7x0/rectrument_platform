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
  if (
    error instanceof Error &&
    (error.name === "AirtableOperationError" ||
      /UNKNOWN_FIELD_NAME|Unknown field name|Unable to (list|create|update|find|delete)/i.test(
        error.message,
      ))
  ) {
    if (fallback.toLowerCase().includes("job")) {
      return "Unable to save job. Please check the job details and try again.";
    }
    if (friendly !== "Something went wrong loading data. Please try again.") {
      return friendly;
    }
    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.replace(/\n[\s\S]*$/, "").slice(0, 240);

    if (
      friendly !== "Something went wrong loading data. Please try again." &&
      !friendly.startsWith("Unable to save or load data right now")
    ) {
      return friendly;
    }

    if (msg.includes("UNKNOWN_ERROR") || /status code/i.test(msg)) {
      return fallback;
    }

    // Domain validation messages are OK for the UI.
    return msg;
  }

  if (friendly !== "Something went wrong loading data. Please try again.") {
    return friendly;
  }

  return fallback;
}
