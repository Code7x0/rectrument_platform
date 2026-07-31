/**
 * Email service abstraction.
 * Swap provider via EMAIL_PROVIDER (console | resend).
 * Never stores delivery state in Airtable.
 */

export type EmailTemplateId =
  | "approval"
  | "rejection"
  | "invitation"
  | "welcome"
  | "account_activated"
  | "password_setup"
  | "candidate_joined"
  | "payout_approved"
  | "payout_paid"
  | "partner_registration_submitted"
  | "job_assigned"
  | "job_unassigned"
  | "client_assigned"
  | "client_unassigned"
  | "manager_job_assigned"
  | "manager_job_unassigned"
  | "role_changed"
  | "document_verified"
  | "document_rejected"
  | "candidate_submitted"
  | "candidate_status_changed";

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
