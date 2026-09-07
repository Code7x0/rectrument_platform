/**
 * Smoke-test every email template via Resend.
 * Usage: npx tsx scripts/test-all-emails.ts
 * Loads .env.production.migration then .env.local (override).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const root = resolve(import.meta.dirname, "..");
loadEnvFile(resolve(root, ".env.production.migration"));
// Local overrides secrets only — keep production URL when testing live email.
const prodUrl = process.env.NEXT_PUBLIC_APP_URL;
loadEnvFile(resolve(root, ".env.local"));
if (prodUrl?.includes("ovato.ai")) {
  process.env.NEXT_PUBLIC_APP_URL = prodUrl.replace(/\/$/, "");
  process.env.APP_URL = (process.env.APP_URL || prodUrl).replace(/\/$/, "");
}

process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://www.ovato.ai";
process.env.APP_URL =
  process.env.APP_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL;

import type { EmailTemplateId } from "../services/email/types";
import { DEFAULT_SUBJECTS, renderBody } from "../services/email/templates";
import { sendEmail } from "../services/email";

const RECIPIENTS = {
  superAdmin: "vinit@talentsocio.com",
  superAdmin2: "epicfinder41@gmail.com",
  admin: "sk7436855@gmail.com",
  feedback: "sk7436855@gmail.com",
};

const base = process.env.NEXT_PUBLIC_APP_URL!;

const TEST_TO =
  process.env.RESEND_TEST_TO?.trim() || RECIPIENTS.superAdmin;

const TEMPLATE_SAMPLES: Array<{
  template: EmailTemplateId;
  to: string;
  data: Record<string, string>;
}> = [
  {
    template: "email_test",
    to: TEST_TO,
    data: { name: "Vinit", provider: "resend", sentAt: new Date().toISOString() },
  },
  {
    template: "partner_registration_submitted",
    to: RECIPIENTS.superAdmin,
    data: {
      partnerName: "Test Partner",
      experience: "5 years",
      specialization: "IT Recruitment",
      email: "partner-test@example.com",
      approvalUrl: `${base}/admin/approvals`,
    },
  },
  {
    template: "approval",
    to: RECIPIENTS.admin,
    data: {
      partnerName: "Test Partner",
      loginUrl: `${base}/sign-in`,
    },
  },
  {
    template: "rejection",
    to: RECIPIENTS.admin,
    data: { name: "Test Partner", reason: "Smoke test only" },
  },
  {
    template: "invitation",
    to: RECIPIENTS.admin,
    data: {
      name: "Test User",
      roleLabel: "Account Manager",
      inviteUrl: `${base}/invite/test`,
    },
  },
  {
    template: "job_assigned",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      jobTitle: "Senior Developer — AB_001",
      jobsUrl: `${base}/partner/jobs`,
    },
  },
  {
    template: "job_unassigned",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      jobTitle: "Senior Developer — AB_001",
      jobsUrl: `${base}/partner/jobs`,
    },
  },
  {
    template: "client_assigned",
    to: RECIPIENTS.admin,
    data: {
      name: "Account Manager",
      clientName: "Test Client",
      clientsUrl: `${base}/account-manager/clients`,
    },
  },
  {
    template: "manager_job_assigned",
    to: RECIPIENTS.admin,
    data: {
      name: "Account Manager",
      jobTitle: "AB_001 — Senior Developer",
      jobsUrl: `${base}/account-manager/jobs`,
    },
  },
  {
    template: "candidate_submitted",
    to: RECIPIENTS.admin,
    data: {
      name: "Account Manager",
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
      reviewUrl: `${base}/account-manager/candidates`,
    },
  },
  {
    template: "candidate_status_changed",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
      statusLabel: "Interviewing",
      candidatesUrl: `${base}/partner/candidates`,
    },
  },
  {
    template: "candidate_joined",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
    },
  },
  {
    template: "admin_candidate_selected",
    to: RECIPIENTS.superAdmin2,
    data: {
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
      clientName: "Test Client",
      partnerCode: "HN_001",
      reviewUrl: `${base}/admin/candidates`,
    },
  },
  {
    template: "feedback_submission",
    to: RECIPIENTS.feedback,
    data: {
      roleLabel: "Account Manager",
      submitterName: "Smoke Test",
      submitterEmail: RECIPIENTS.admin,
      feedbackType: "Feedback",
      message: "OVATO email smoke test — safe to ignore.",
    },
  },
  {
    template: "partner_query_submitted",
    to: RECIPIENTS.feedback,
    data: {
      partnerCode: "HN_001",
      feedbackType: "Account question",
      message: "Smoke test partner query.",
      reviewUrl: `${base}/account-manager/feedback`,
    },
  },
  {
    template: "job_updated",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      jobTitle: "AB_001",
      changedSummary: "Job description updated (smoke test).",
      jobsUrl: `${base}/partner/jobs`,
    },
  },
  {
    template: "payout_approved",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      candidateName: "Jane Doe",
      amount: "₹50,000",
    },
  },
  {
    template: "payout_paid",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      candidateName: "Jane Doe",
      amount: "₹50,000",
    },
  },
  {
    template: "document_verified",
    to: RECIPIENTS.admin,
    data: { name: "Partner", documentType: "PAN" },
  },
  {
    template: "document_rejected",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      documentType: "Aadhaar",
      reason: "Blurry scan (smoke test)",
    },
  },
  {
    template: "daily_digest_am",
    to: RECIPIENTS.admin,
    data: {
      name: "Account Manager",
      digestBody: "SMOKE TEST — AM daily digest sample block.",
      dashboardUrl: `${base}/account-manager`,
    },
  },
  {
    template: "daily_digest_partner",
    to: RECIPIENTS.admin,
    data: {
      name: "Partner",
      digestBody: "SMOKE TEST — Partner daily digest sample block.",
      dashboardUrl: `${base}/partner`,
    },
  },
  {
    template: "daily_digest_admin",
    to: RECIPIENTS.superAdmin,
    data: {
      name: "Chief",
      digestBody: "SMOKE TEST — Admin daily digest sample block.",
      dashboardUrl: `${base}/admin`,
    },
  },
];

async function main() {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  const from = process.env.EMAIL_FROM ?? "(unset)";
  console.log(`\nOVATO email smoke test`);
  console.log(`Provider: ${provider}`);
  console.log(`From: ${from}`);
  console.log(`App URL: ${base}\n`);

  const results: Array<{ template: string; to: string; ok: boolean; id?: string; error?: string }> = [];

  for (const sample of TEMPLATE_SAMPLES) {
    const to = process.env.RESEND_TEST_TO?.trim() || sample.to;
    const subject = `[SMOKE] ${DEFAULT_SUBJECTS[sample.template]}`;
    try {
      const result = await sendEmail({
        to,
        template: sample.template,
        subject,
        data: sample.data,
      });
      const preview = renderBody(sample.template, sample.data).split("\n")[0];
      console.log(`✓ ${sample.template} → ${to} (${result.provider}, ${result.id})`);
      console.log(`  ${preview}…`);
      results.push({ template: sample.template, to, ok: true, id: result.id });
      // Avoid Resend rate burst
      await new Promise((r) => setTimeout(r, 600));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${sample.template} → ${to}: ${message}`);
      results.push({ template: sample.template, to, ok: false, error: message });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Summary: ${passed}/${results.length} sent ---`);
  if (failed.length) {
    console.log("Failed:", failed.map((f) => f.template).join(", "));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
