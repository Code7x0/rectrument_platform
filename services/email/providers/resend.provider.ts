import { Resend } from "resend";

import { getOptionalEnv, getRequiredEnv } from "@/lib/api/env";
import type {
  EmailService,
  SendEmailInput,
  SendEmailResult,
} from "@/services/email/types";
import { DEFAULT_SUBJECTS, renderBody, renderSubject } from "@/services/email/templates";
import { renderOvatoEmailHtml } from "@/services/email/layout";

/**
 * Production email delivery via Resend.
 * Requires RESEND_API_KEY + EMAIL_FROM. Does not write to Airtable.
 */
export class ResendEmailProvider implements EmailService {
  private readonly client: Resend;
  private readonly from: string;

  constructor() {
    this.client = new Resend(getRequiredEnv("RESEND_API_KEY"));
    this.from = getRequiredEnv("EMAIL_FROM");
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const subject = input.subject ?? renderSubject(input.template, input.data);
    const text = renderBody(input.template, input.data);
    const html = renderOvatoEmailHtml(text);

    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject,
      text,
      html,
    });

    if (error) {
      throw new Error(
        `Resend send failed: ${error.message ?? JSON.stringify(error)}`,
      );
    }

    const id = data?.id ?? `resend_${Date.now()}`;
    console.info("[email:resend]", {
      id,
      to: input.to,
      template: input.template,
      subject,
      from: this.from,
    });

    return { id, provider: "resend", queued: true };
  }
}

/** Soft check used by factory — missing keys fall back to console in non-strict envs. */
export function isResendConfigured(): boolean {
  return Boolean(
    getOptionalEnv("RESEND_API_KEY")?.trim() &&
      getOptionalEnv("EMAIL_FROM")?.trim(),
  );
}
