import type { EmailTemplateId } from "@/services/email/types";

export const DEFAULT_SUBJECTS: Record<EmailTemplateId, string> = {
  approval: "Welcome aboard — TalentSocio Partner Account Approved",
  rejection: "Update on your Talent Partner application",
  invitation: "You're invited to join the recruitment platform",
  welcome: "Welcome to the recruitment platform",
  account_activated: "Your account is now active",
  password_setup: "Set up your password",
  candidate_joined: "Your candidate has joined",
  payout_approved: "Payout eligible for payment",
  payout_paid: "Payout marked as paid",
  partner_registration_submitted:
    "New Partner Registration – Approval Required",
  job_assigned: "New Job Assigned – TalentSocio",
  job_unassigned: "Job Unassignment Notice – TalentSocio",
  client_assigned: "Client Assigned – TalentSocio",
  client_unassigned: "Client Unassignment Notice – TalentSocio",
  manager_job_assigned: "Job Assigned – TalentSocio",
  manager_job_unassigned: "Job Unassignment Notice – TalentSocio",
  role_changed: "Your role has been updated",
  document_verified: "Document verified – TalentSocio",
  document_rejected: "Document rejected – TalentSocio",
  candidate_submitted: "New candidate submitted – TalentSocio",
  candidate_status_changed: "Candidate status update – TalentSocio",
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
        `Hi ${partnerName},`,
        "",
        "Welcome aboard as our newest Talent Partner — we're thrilled to have you on the platform.",
        "",
        "We can't wait to see the great hires you'll help make happen!",
        "",
        data.loginUrl ? `Sign in: ${data.loginUrl}` : "",
        "",
        "Cheers,",
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
        "Hello Chief,",
        "",
        "A new partner has registered, please review the request below:",
        "",
        `Name: ${data.partnerName ?? data.name ?? "—"}`,
        `Years of Experience: ${data.experience ?? "—"}`,
        `Specialization: ${data.specialization ?? data.skills ?? "—"}`,
        data.email ? `Email: ${data.email}` : "",
        "",
        data.approvalUrl
          ? `👉 Approval Link: ${data.approvalUrl}`
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
    case "job_unassigned":
      return [
        `Hi ${data.name ?? data.partnerName ?? "there"},`,
        "",
        `You have been unassigned from ${data.jobTitle ?? "a job"}.`,
        "",
        "This role will no longer appear on your Assigned Jobs list. If you believe this was a mistake, contact your Account Manager.",
        data.jobsUrl ? `View remaining jobs: ${data.jobsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "client_assigned":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `You have been assigned Client ${data.clientName ?? "a client"}.`,
        "",
        "Open your Clients list to review open jobs and pipeline.",
        data.clientsUrl ? `Open clients: ${data.clientsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "client_unassigned":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `You have been removed from Client ${data.clientName ?? "a client"}.`,
        "",
        "That client and its jobs will no longer appear on your dashboard.",
        data.clientsUrl ? `View remaining clients: ${data.clientsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "manager_job_assigned":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `You have been assigned Job ${data.jobTitle ?? "an open role"}.`,
        "",
        "Allocate Talent Partners and review candidate submissions from your Jobs list.",
        data.jobsUrl ? `Open jobs: ${data.jobsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "manager_job_unassigned":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `You have been removed from Job ${data.jobTitle ?? "a job"}.`,
        "",
        "That job will no longer appear in your assigned workload.",
        data.jobsUrl ? `View remaining jobs: ${data.jobsUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "role_changed":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `Your role has changed from ${data.fromRole ?? "previous"} to ${data.toRole ?? "new"}.`,
        "",
        "Sign in again if your dashboard or permissions look different.",
        "",
        "TalentSocio Team",
      ].join("\n");
    case "document_verified":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `Your ${data.documentType ?? "document"} was verified.`,
        "",
        "You can continue submitting candidates on your allocated jobs.",
        "",
        "TalentSocio Team",
      ].join("\n");
    case "document_rejected":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `Your ${data.documentType ?? "document"} was rejected.`,
        data.reason ? `Reason: ${data.reason}` : "",
        "",
        "Please re-upload a corrected document from My Documents.",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "payout_paid":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `Payment for ${data.candidateName ?? "your candidate"} was marked paid${data.amount ? ` (${data.amount})` : ""}.`,
        "",
        "Open My Earnings for details.",
        "",
        "TalentSocio Team",
      ].join("\n");
    case "candidate_submitted":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `${data.candidateName ?? "A candidate"} was submitted for ${data.jobTitle ?? "a job"}.`,
        "",
        "Open your Candidates / Review Queue to review the profile.",
        data.reviewUrl ? `Review: ${data.reviewUrl}` : "",
        "",
        "TalentSocio Team",
      ]
        .filter(Boolean)
        .join("\n");
    case "candidate_status_changed":
      return [
        `Hi ${data.name ?? "there"},`,
        "",
        `${data.candidateName ?? "Your candidate"} on ${data.jobTitle ?? "a job"} is now ${data.statusLabel ?? "updated"}.`,
        "",
        "Open My Candidates to view the latest pipeline status.",
        data.candidatesUrl ? `View candidates: ${data.candidatesUrl}` : "",
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
