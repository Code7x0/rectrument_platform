import type {
  EmailService,
  EmailTemplateId,
  SendEmailInput,
  SendEmailResult,
} from "../types";

const DEFAULT_SUBJECTS: Record<EmailTemplateId, string> = {
  approval: "Your Talent Partner application was approved",
  rejection: "Update on your Talent Partner application",
  invitation: "You're invited to join the recruitment platform",
  welcome: "Welcome to the recruitment platform",
  account_activated: "Your account is now active",
  password_setup: "Set up your password",
  candidate_joined: "Your candidate has joined",
  payout_approved: "Payout eligible for payment",
};

function renderBody(template: EmailTemplateId, data: Record<string, string>): string {
  switch (template) {
    case "approval":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        "Your Talent Partner application has been approved.",
        data.loginUrl
          ? `Sign in here to get started: ${data.loginUrl}`
          : "You can now sign in with the email you registered.",
        "",
        "Welcome aboard.",
      ].join("\n");
    case "rejection":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        "Unfortunately we are unable to approve your Talent Partner application at this time.",
        data.reason ? `Reason: ${data.reason}` : "",
        "",
        "If you have questions, reply to this email.",
      ]
        .filter(Boolean)
        .join("\n");
    case "invitation":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `You have been invited as ${data.roleLabel ?? "a team member"}.`,
        data.inviteUrl
          ? `Accept your invitation: ${data.inviteUrl}`
          : "Use the invitation link provided by your administrator.",
        data.expiresAt ? `This link expires on ${data.expiresAt}.` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "welcome":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        "Welcome to the Recruitment Partner Platform.",
        data.loginUrl ? `Open your dashboard: ${data.loginUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "account_activated":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        "Your account has been activated. You can sign in now.",
        data.loginUrl ? data.loginUrl : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "password_setup":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        "Set your password to finish joining the platform.",
        data.inviteUrl ? data.inviteUrl : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "candidate_joined":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `${data.candidateName ?? "Your candidate"} has joined for ${data.jobTitle ?? "the role"}.`,
        "Track earnings and status in My Earnings.",
      ].join("\n");
    case "payout_approved":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `A payout is now eligible${data.candidateName ? ` for ${data.candidateName}` : ""}${data.amount ? ` (${data.amount})` : ""}.`,
        "Open My Earnings for details.",
      ].join("\n");
    default: {
      const _exhaustive: never = template;
      return String(_exhaustive);
    }
  }
}

/**
 * Development / staging provider — logs instead of sending.
 */
export class ConsoleEmailProvider implements EmailService {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const subject = input.subject ?? DEFAULT_SUBJECTS[input.template];
    const body = renderBody(input.template, input.data);
    const id = `console_${Date.now()}`;

    console.info("[email:console]", {
      id,
      to: input.to,
      template: input.template,
      subject,
      body,
    });

    return { id, provider: "console", queued: true };
  }
}

export { DEFAULT_SUBJECTS, renderBody };
