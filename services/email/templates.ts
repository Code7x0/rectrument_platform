import { APP_NAME } from "@/lib/constants";
import {
  formatOvatoDate,
  formatOvatoEmailBody,
  formatOvatoSubject,
  formatTable,
  OVATO_SIGNATURE,
} from "@/services/email/layout";
import type { EmailTemplateId } from "@/services/email/types";

function digestDate(data: Record<string, string>): string {
  return data.digestDate ?? formatOvatoDate(new Date());
}

export const DEFAULT_SUBJECTS: Record<EmailTemplateId, string> = {
  approval: formatOvatoSubject(["Partner Account Approved"]),
  rejection: formatOvatoSubject(["Partner Application Update"]),
  invitation: formatOvatoSubject(["Platform Invitation"]),
  welcome: formatOvatoSubject(["Welcome"]),
  account_activated: formatOvatoSubject(["Account Activated"]),
  password_setup: formatOvatoSubject(["Password Setup"]),
  candidate_joined: formatOvatoSubject(["Candidate Joined"]),
  payout_approved: formatOvatoSubject(["Payout Eligible"]),
  payout_paid: formatOvatoSubject(["Payout Paid"]),
  partner_registration_submitted: formatOvatoSubject([
    "New Partner Registration",
    "Approval Required",
  ]),
  job_assigned: formatOvatoSubject(["New Job Assigned"]),
  job_unassigned: formatOvatoSubject(["Job Unassigned"]),
  client_assigned: formatOvatoSubject(["New Account Allocated"]),
  client_unassigned: formatOvatoSubject(["Client Unassigned"]),
  client_details_updated: formatOvatoSubject(["Client Details Updated"]),
  manager_job_assigned: formatOvatoSubject(["Job Assigned"]),
  manager_job_unassigned: formatOvatoSubject(["Job Unassigned"]),
  role_changed: formatOvatoSubject(["Role Updated"]),
  document_verified: formatOvatoSubject(["Document Verified"]),
  document_rejected: formatOvatoSubject(["Document Rejected"]),
  candidate_submitted: formatOvatoSubject(["New Candidate Submitted"]),
  candidate_status_changed: formatOvatoSubject(["Candidate Status Update"]),
  feedback_submission: formatOvatoSubject(["Platform Feedback"]),
  admin_candidate_selected: formatOvatoSubject(["New Select", "Approval Required"]),
  partner_query_submitted: formatOvatoSubject(["Partner Query"]),
  job_updated: formatOvatoSubject(["Job Details Updated"]),
  daily_digest_am: formatOvatoSubject(["Daily Recruiting Digest"]),
  daily_digest_partner: formatOvatoSubject(["Daily Recruiting Digest"]),
  daily_digest_admin: formatOvatoSubject(["Daily Recruiting Digest"]),
  email_test: formatOvatoSubject(["Test Email"]),
};

export function renderSubject(
  template: EmailTemplateId,
  data: Record<string, string>,
): string {
  if (data.emailSubject?.trim()) {
    return data.emailSubject.trim();
  }

  const date = digestDate(data);

  switch (template) {
    case "client_assigned":
      return formatOvatoSubject([
        "New Account Allocated",
        data.clientName ?? "Client",
      ]);
    case "client_details_updated":
      return formatOvatoSubject([
        "Client Details Updated",
        date,
        data.clientName ?? "Client",
      ]);
    case "job_updated":
      return formatOvatoSubject([
        "Job Details Updated",
        date,
        data.jobCode ?? data.jobTitle ?? "Job",
      ]);
    case "daily_digest_am":
    case "daily_digest_partner":
    case "daily_digest_admin":
      return formatOvatoSubject(["Daily Recruiting Digest", date]);
    case "candidate_submitted":
      return formatOvatoSubject([
        "New Candidate Submitted",
        data.jobTitle ?? "Role",
      ]);
    case "candidate_status_changed":
      return formatOvatoSubject([
        "Candidate Status Update",
        data.candidateName ?? "Candidate",
      ]);
    case "admin_candidate_selected":
      return formatOvatoSubject([
        "New Select",
        data.candidateName ?? "Candidate",
      ]);
    default:
      return DEFAULT_SUBJECTS[template];
  }
}

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
      return formatOvatoEmailBody({
        intro: `Congratulations ${partnerName}.`,
        sections: [
          "Welcome aboard as our newest Talent Partner — we're thrilled to have you on the platform.",
          "We can't wait to see the great hires you'll help make happen!",
        ],
        dashboardUrl: data.loginUrl,
        closing: "Happy Hiring!!!",
      });
    }
    case "rejection":
      return formatOvatoEmailBody({
        sections: [
          "Unfortunately we are unable to approve your Talent Partner application at this time.",
          data.reason ? `Reason: ${data.reason}` : "",
          "If you have questions, reply to this email.",
        ],
      });
    case "invitation":
      return formatOvatoEmailBody({
        sections: [
          `You have been invited as ${data.roleLabel ?? "a team member"}.`,
          data.inviteUrl
            ? `Accept your invitation: ${data.inviteUrl}`
            : "Use the invitation link provided by your administrator.",
          data.expiresAt ? `This link expires on ${data.expiresAt}.` : "",
        ],
      });
    case "welcome":
      return formatOvatoEmailBody({
        sections: ["Welcome to the Recruitment Partner Platform."],
        dashboardUrl: data.loginUrl,
        closing: "Happy Hiring!!!",
      });
    case "account_activated":
      return formatOvatoEmailBody({
        sections: ["Your account has been activated. You can sign in now."],
        dashboardUrl: data.loginUrl,
      });
    case "password_setup":
      return formatOvatoEmailBody({
        sections: [
          "Set your password to finish joining the platform.",
          data.inviteUrl ? data.inviteUrl : "",
        ],
      });
    case "candidate_joined":
      return formatOvatoEmailBody({
        sections: [
          `${data.candidateName ?? "Your candidate"} has joined for ${data.jobTitle ?? "the role"}.`,
          "Track earnings and status in My Earnings.",
        ],
        dashboardUrl: data.candidatesUrl,
      });
    case "payout_approved":
      return formatOvatoEmailBody({
        sections: [
          `A payout is now eligible${data.candidateName ? ` for ${data.candidateName}` : ""}${data.amount ? ` (${data.amount})` : ""}.`,
          "Open My Earnings for details.",
        ],
        dashboardUrl: data.dashboardUrl,
      });
    case "payout_paid":
      return formatOvatoEmailBody({
        sections: [
          `Payment for ${data.candidateName ?? "your candidate"} was marked paid${data.amount ? ` (${data.amount})` : ""}.`,
          "Open My Earnings for details.",
        ],
        dashboardUrl: data.dashboardUrl,
      });
    case "partner_registration_submitted":
      return formatOvatoEmailBody({
        greeting: "Hello Chief",
        sections: [
          "A new partner has registered, please review the request below:",
          formatTable(
            ["Name", "Years of Experience", "Specialization", "Email"],
            [
              [
                data.partnerName ?? data.name ?? "—",
                data.experience ?? "—",
                data.specialization ?? data.skills ?? "—",
                data.email ?? "—",
              ],
            ],
          ),
          data.approvalUrl
            ? `Approval Link: ${data.approvalUrl}`
            : "Open the Approvals page in the Admin console to review.",
        ],
      });
    case "job_assigned":
      return formatOvatoEmailBody({
        sections: [
          `You have been allocated a new job: ${data.jobTitle ?? "Open role"}.`,
          "Sign in to OVATO.ai to read the job description, download attachments, and submit candidates.",
        ],
        dashboardUrl: data.jobsUrl,
        closing: "Happy Hiring!!!",
      });
    case "job_unassigned":
      return formatOvatoEmailBody({
        sections: [
          `You have been unassigned from ${data.jobTitle ?? "a job"}.`,
          "This role will no longer appear on your Assigned Jobs list.",
        ],
        dashboardUrl: data.jobsUrl,
      });
    case "client_assigned":
      return formatOvatoEmailBody({
        intro: "Congratulations.",
        sections: [
          `A new account, ${data.clientName ?? "a client"}${data.clientCode ? ` (${data.clientCode})` : ""}, is active and has been added to you for delivery.`,
        ],
        dashboardUrl: data.clientsUrl,
        closing: "Happy Hiring!!!",
      });
    case "client_unassigned":
      return formatOvatoEmailBody({
        sections: [
          `You have been removed from Client ${data.clientName ?? "a client"}.`,
          "That client and its jobs will no longer appear on your dashboard.",
        ],
        dashboardUrl: data.clientsUrl,
      });
    case "client_details_updated":
      return formatOvatoEmailBody({
        sections: [
          `${data.clientName ?? "A client"}${data.clientCode ? ` (${data.clientCode})` : ""} has been updated. Do have a look.`,
          data.changeTable?.trim()
            ? data.changeTable
            : data.changedSummary?.trim()
              ? formatTable(
                  ["Client ID", "Field Updated", "Present Value"],
                  [[data.clientCode ?? "—", "Details", data.changedSummary]],
                )
              : "",
        ],
        dashboardUrl: data.clientsUrl,
        closing: "Happy Hiring!!!",
      });
    case "manager_job_assigned":
      return formatOvatoEmailBody({
        sections: [
          `You have been assigned Job ${data.jobTitle ?? "an open role"}.`,
          "Allocate Talent Partners and review candidate submissions from your Jobs list.",
        ],
        dashboardUrl: data.jobsUrl,
        closing: "Happy Hiring!!!",
      });
    case "manager_job_unassigned":
      return formatOvatoEmailBody({
        sections: [
          `You have been removed from Job ${data.jobTitle ?? "a job"}.`,
          "That job will no longer appear in your assigned workload.",
        ],
        dashboardUrl: data.jobsUrl,
      });
    case "role_changed":
      return formatOvatoEmailBody({
        sections: [
          `Your role has changed from ${data.fromRole ?? "previous"} to ${data.toRole ?? "new"}.`,
          "Sign in again if your dashboard or permissions look different.",
        ],
        dashboardUrl: data.loginUrl,
      });
    case "document_verified":
      return formatOvatoEmailBody({
        sections: [
          `Your ${data.documentType ?? "document"} was verified.`,
          "You can continue submitting candidates on your allocated jobs.",
        ],
      });
    case "document_rejected":
      return formatOvatoEmailBody({
        sections: [
          `Your ${data.documentType ?? "document"} was rejected.`,
          data.reason ? `Reason: ${data.reason}` : "",
          "Please re-upload a corrected document from My Documents.",
        ],
      });
    case "candidate_submitted":
      return formatOvatoEmailBody({
        sections: [
          `${data.candidateName ?? "A candidate"} was submitted for ${data.jobTitle ?? "a job"}.`,
          "Open your Candidates / Review Queue to review the profile.",
        ],
        dashboardUrl: data.reviewUrl,
        closing: "Happy Hiring!!!",
      });
    case "candidate_status_changed":
      return formatOvatoEmailBody({
        sections: [
          `${data.candidateName ?? "Your candidate"} on ${data.jobTitle ?? "a job"} is now ${data.statusLabel ?? "updated"}.`,
          data.internalFeedback
            ? `Internal Feedback: ${data.internalFeedback}`
            : "",
        ],
        dashboardUrl: data.candidatesUrl,
      });
    case "feedback_submission":
      return formatOvatoEmailBody({
        greeting: "Hello",
        sections: [
          `${data.roleLabel ?? "A user"} submitted feedback on the platform.`,
          data.partnerCode ? `Partner ID: ${data.partnerCode}` : "",
          data.submitterName ? `Name: ${data.submitterName}` : "",
          data.submitterEmail ? `Email: ${data.submitterEmail}` : "",
          data.feedbackType ? `Type: ${data.feedbackType}` : "",
          "",
          "Message:",
          data.message ?? "—",
        ],
      });
    case "admin_candidate_selected":
      return formatOvatoEmailBody({
        greeting: "Hello Chief",
        sections: [
          "A candidate has been marked as Selected:",
          formatTable(
            ["Candidate", "Job", "Client", "Partner"],
            [
              [
                data.candidateName ?? "—",
                data.jobTitle ?? "—",
                data.clientName ?? "—",
                data.partnerCode ?? "—",
              ],
            ],
          ),
        ],
        dashboardUrl: data.reviewUrl,
      });
    case "partner_query_submitted":
      return formatOvatoEmailBody({
        greeting: "Hello",
        sections: [
          "A Talent Partner submitted a question or request on the platform.",
          data.partnerCode ? `Partner ID: ${data.partnerCode}` : "",
          data.feedbackType ? `Type: ${data.feedbackType}` : "",
          data.jobTitle ? `Job: ${data.jobTitle}` : "",
          data.candidateName ? `Candidate: ${data.candidateName}` : "",
          "",
          "Message:",
          data.message ?? "—",
        ],
        dashboardUrl: data.reviewUrl,
      });
    case "job_updated":
      return formatOvatoEmailBody({
        sections: [
          `Job ${data.jobCode ?? data.jobTitle ?? "update"} has been updated. Do have a look.`,
          data.changeTable?.trim()
            ? data.changeTable
            : data.changedSummary?.trim()
              ? formatTable(
                  ["Job ID", "Field Updated", "Present Value"],
                  [[data.jobCode ?? data.jobTitle ?? "—", "Details", data.changedSummary]],
                )
              : "",
        ],
        dashboardUrl: data.jobsUrl,
        closing: "Happy Hiring!!!",
      });
    case "daily_digest_am":
      return formatOvatoEmailBody({
        greeting: data.name?.trim() ? `Hey ${data.name.trim()}` : "Hey",
        intro: "Below is your snapshot for the day. Let's hire fast!!",
        sections: [data.digestBody ?? "No activity to report today."],
        dashboardUrl: data.dashboardUrl,
      });
    case "daily_digest_partner":
      return formatOvatoEmailBody({
        greeting: data.name?.trim() ? `Hey ${data.name.trim()}` : "Hey",
        intro: "Below is your snapshot for the day. Let's make it happen!!",
        sections: [data.digestBody ?? "No activity to report today."],
        dashboardUrl: data.dashboardUrl,
      });
    case "daily_digest_admin":
      return formatOvatoEmailBody({
        greeting: "Super Admin/Admin",
        intro: "Hey\n\nIs team working well … If not, send a note or tinker them!!",
        sections: [data.digestBody ?? "No activity to report today."],
        dashboardUrl: data.dashboardUrl,
      });
    case "email_test":
      return formatOvatoEmailBody({
        sections: [
          `This is a test email from ${APP_NAME}.`,
          `Provider: ${data.provider ?? "unknown"}`,
          `Sent at: ${data.sentAt ?? new Date().toISOString()}`,
          "If you received this, transactional email is configured correctly.",
        ],
      });
    default: {
      const _exhaustive: never = template;
      return String(_exhaustive);
    }
  }
}

export { OVATO_SIGNATURE };
