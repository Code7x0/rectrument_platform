import { ConsoleEmailProvider } from "@/services/email/providers/console.provider";
import type { EmailService, SendEmailInput, SendEmailResult } from "@/services/email/types";

/**
 * Resolve the configured email provider.
 * Swap implementation here when connecting Resend / SendGrid / SES.
 */
export function getEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  switch (provider) {
    case "console":
      return new ConsoleEmailProvider();
    // Future: case "resend": return new ResendEmailProvider();
    // Future: case "sendgrid": return new SendGridEmailProvider();
    // Future: case "ses": return new SesEmailProvider();
    default:
      return new ConsoleEmailProvider();
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  return getEmailService().send(input);
}

export type {
  EmailService,
  EmailTemplateId,
  SendEmailInput,
  SendEmailResult,
} from "@/services/email/types";
