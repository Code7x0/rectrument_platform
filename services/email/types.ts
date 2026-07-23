/**
 * Email service abstraction.
 * Swap provider via EMAIL_PROVIDER without changing callers.
 * Production providers (Resend / SendGrid / SES) are not wired yet.
 */

export type EmailTemplateId =
  | "approval"
  | "rejection"
  | "invitation"
  | "welcome"
  | "account_activated"
  | "password_setup"
  | "candidate_joined"
  | "payout_approved";

export interface SendEmailInput {
  to: string;
  template: EmailTemplateId;
  subject?: string;
  data: Record<string, string>;
}

export interface SendEmailResult {
  id: string;
  provider: string;
  queued: boolean;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
