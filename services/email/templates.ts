import type { EmailTemplateId } from "@/services/email/types";

export const DEFAULT_SUBJECTS: Record<EmailTemplateId, string> = {
  approval: "Your TalentSocio Partner Account Has Been Approved",
  rejection: "Update on your Talent Partner application",
  invitation: "You're invited to join the recruitment platform",
  welcome: "Welcome to the recruitment platform",
  account_activated: "Your account is now active",
  password_setup: "Set up your password",
  candidate_joined: "Your candidate has joined",
  payout_approved: "Payout eligible for payment",
  partner_registration_submitted:
    "New Partner Registration – Approval Required",
  job_assigned: "New Job Assigned – TalentSocio",
};

/**
 * Render plain-text email bodies. Shared by console + Resend providers.
 */
export function renderBody(
  template: EmailTemplateId,
  data: Record<string, string>,
): string {
  switch (template) {
    case "approval": {
      const partnerName = data.partnerName ?? data.name ?? "there";
      return [
        `Hello ${partnerName},`,
        "",
        "Congratulations! Your TalentSocio Partner account has been approved.",
        "",
        "You can now sign in to the Recruiting Partner Platform using your registered email address.",
        data.loginUrl ? `Sign in: ${data.loginUrl}` : "",
        "",
        "If you experience any issues accessing your account, please contact the TalentSocio team.",
        "",
        "Best regards,",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    }
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
    case "partner_registration_submitted":
      return [
        "Hello,",
        "",
        "A new Talent Partner registration requires your approval.",
        "",
        `Partner Name: ${data.partnerName ?? data.name ?? "—"}`,
        `Experience: ${data.experience ?? "—"}`,
        `Specialization: ${data.specialization ?? data.skills ?? "—"}`,
        data.email ? `Email: ${data.email}` : "",
        "",
        data.approvalUrl
          ? `Review & approve: ${data.approvalUrl}`
          : "Open the Approvals page in the Admin console to review.",
        "",
        "TalentSocio Recruiting Platform",
      ]
        .filter(Boolean)
        .join("\n");
    case "job_assigned":
      return [
        `Hi ${data.name ?? data.partnerName ?? "there"},`,
        "",
        `You have been allocated a new job: ${data.jobTitle ?? "Open role"}.`,
        "",
        "Sign in to the Recruiting Partner Platform to read the job description, download attachments, and submit candidates.",
        data.jobsUrl ? `Open your jobs: ${data.jobsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    default: {
      const _exhaustive: never = template;
      return String(_exhaustive);
    }
  }
}
