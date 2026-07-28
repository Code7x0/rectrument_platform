import { Resend } from "resend";

import { getOptionalEnv, getRequiredEnv } from "@/lib/api/env";
import type {
  EmailService,
  SendEmailInput,
  SendEmailResult,
} from "@/services/email/types";
import { DEFAULT_SUBJECTS, renderBody } from "@/services/email/templates";

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
    const subject = input.subject ?? DEFAULT_SUBJECTS[input.template];
    const text = renderBody(input.template, input.data);
    const html = textToSimpleHtml(text);

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

function textToSimpleHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 15px; line-height: 1.55; color: #0f172a;">${escaped
    .split("\n")
    .map((line) => (line.trim() ? line : "<br />"))
    .join("<br />")}</div>`;
}

/** Soft check used by factory — missing keys fall back to console in non-strict envs. */
export function isResendConfigured(): boolean {
  return Boolean(
    getOptionalEnv("RESEND_API_KEY")?.trim() &&
      getOptionalEnv("EMAIL_FROM")?.trim(),
  );
}
