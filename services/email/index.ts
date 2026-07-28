import { ConsoleEmailProvider } from "@/services/email/providers/console.provider";
import {
  isResendConfigured,
  ResendEmailProvider,
} from "@/services/email/providers/resend.provider";
import type {
  EmailService,
  SendEmailInput,
  SendEmailResult,
} from "@/services/email/types";

/**
 * Resolve the configured email provider.
 * - EMAIL_PROVIDER=resend → Resend (requires RESEND_API_KEY + EMAIL_FROM)
 * - EMAIL_PROVIDER=console (default) → log only
 * If resend is selected but keys are missing, falls back to console with a warning.
 */
export function getEmailService(): EmailService {
  const provider = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

  switch (provider) {
    case "resend": {
      if (!isResendConfigured()) {
        console.warn(
          "[email] EMAIL_PROVIDER=resend but RESEND_API_KEY / EMAIL_FROM missing — using console provider",
        );
        return new ConsoleEmailProvider();
      }
      return new ResendEmailProvider();
    }
    case "console":
      return new ConsoleEmailProvider();
    default:
      console.warn(
        `[email] Unknown EMAIL_PROVIDER="${provider}" — using console`,
      );
      return new ConsoleEmailProvider();
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  return getEmailService().send(input);
}

/**
 * Best-effort send: never throws. Logs failures for ops.
 * Use for non-blocking notifications (e.g. partner approval).
 */
export async function sendEmailSafe(
  input: SendEmailInput,
): Promise<SendEmailResult | null> {
  try {
    return await sendEmail(input);
  } catch (error) {
    console.error("[email] send failed (non-blocking)", {
      to: input.to,
      template: input.template,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export type {
  EmailService,
  EmailTemplateId,
  SendEmailInput,
  SendEmailResult,
} from "@/services/email/types";
