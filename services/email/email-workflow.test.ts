import assert from "node:assert/strict";
import test from "node:test";

import { CANONICAL_EMAIL_ORIGIN } from "@/lib/brand";
import { BRAND_LOGO_PATH } from "@/lib/constants";
import {
  formatCountLine,
  formatDigestDayHeading,
  formatTable,
  renderOvatoEmailHtml,
} from "@/services/email/layout";
import { DEFAULT_SUBJECTS, renderBody, renderSubject } from "@/services/email/templates";
import type { EmailTemplateId } from "@/services/email/types";

const base = "https://www.ovato.ai";
const LOGO_URL = `${CANONICAL_EMAIL_ORIGIN}${BRAND_LOGO_PATH}`;

const TEMPLATE_FIXTURES: Array<{
  template: EmailTemplateId;
  data: Record<string, string>;
}> = [
  {
    template: "email_test",
    data: { name: "Test", provider: "unit", sentAt: "2026-09-12T00:00:00.000Z" },
  },
  {
    template: "partner_registration_submitted",
    data: {
      partnerName: "Test Partner",
      experience: "5 years",
      specialization: "IT Recruitment",
      email: "partner@example.com",
      approvalUrl: `${base}/admin/approvals`,
    },
  },
  { template: "approval", data: { partnerName: "Test Partner", loginUrl: `${base}/sign-in` } },
  { template: "rejection", data: { name: "Test Partner", reason: "Unit test" } },
  {
    template: "invitation",
    data: { name: "Test User", roleLabel: "Account Manager", inviteUrl: `${base}/invite/test` },
  },
  { template: "welcome", data: { name: "Partner", loginUrl: `${base}/sign-in` } },
  { template: "account_activated", data: { name: "Partner", loginUrl: `${base}/sign-in` } },
  { template: "password_setup", data: { name: "Partner", setupUrl: `${base}/sign-in` } },
  {
    template: "job_assigned",
    data: { name: "Partner", jobTitle: "Senior Developer", jobsUrl: `${base}/partner/jobs` },
  },
  {
    template: "job_unassigned",
    data: { name: "Partner", jobTitle: "Senior Developer", jobsUrl: `${base}/partner/jobs` },
  },
  {
    template: "client_assigned",
    data: {
      name: "Account Manager",
      clientName: "Test Client",
      clientsUrl: `${base}/account-manager/clients`,
    },
  },
  {
    template: "client_unassigned",
    data: {
      name: "Account Manager",
      clientName: "Test Client",
      clientsUrl: `${base}/account-manager/clients`,
    },
  },
  {
    template: "client_details_updated",
    data: {
      name: "Account Manager",
      clientName: "Test Client",
      clientCode: "CL_001",
      changeTable: formatTable(
        ["Client ID", "Field Updated", "Present Value"],
        [["CL_001", "Status", "On hold"]],
      ),
      clientsUrl: `${base}/account-manager/clients`,
    },
  },
  {
    template: "manager_job_assigned",
    data: {
      name: "Account Manager",
      jobTitle: "AB_001 — Senior Developer",
      jobsUrl: `${base}/account-manager/jobs`,
    },
  },
  {
    template: "manager_job_unassigned",
    data: {
      name: "Account Manager",
      jobTitle: "AB_001 — Senior Developer",
      jobsUrl: `${base}/account-manager/jobs`,
    },
  },
  {
    template: "role_changed",
    data: { name: "User", roleLabel: "Admin", loginUrl: `${base}/sign-in` },
  },
  {
    template: "candidate_submitted",
    data: {
      name: "Account Manager",
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
      reviewUrl: `${base}/account-manager/candidates`,
    },
  },
  {
    template: "candidate_status_changed",
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
    data: {
      name: "Partner",
      candidateName: "Jane Doe",
      jobTitle: "Senior Developer",
    },
  },
  {
    template: "admin_candidate_selected",
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
    data: {
      roleLabel: "Account Manager",
      submitterName: "Test User",
      submitterEmail: "test@example.com",
      feedbackType: "Feedback",
      message: "Unit test feedback",
    },
  },
  {
    template: "partner_query_submitted",
    data: {
      partnerCode: "HN_001",
      feedbackType: "Account question",
      message: "Unit test query",
      reviewUrl: `${base}/account-manager/feedback`,
    },
  },
  {
    template: "job_updated",
    data: {
      name: "Partner",
      jobTitle: "AB_001",
      jobCode: "AB_001",
      changedSummary: "Job description updated.",
      jobsUrl: `${base}/partner/jobs`,
    },
  },
  {
    template: "payout_approved",
    data: { name: "Partner", candidateName: "Jane Doe", amount: "₹50,000" },
  },
  {
    template: "payout_paid",
    data: { name: "Partner", candidateName: "Jane Doe", amount: "₹50,000" },
  },
  { template: "document_verified", data: { name: "Partner", documentType: "PAN" } },
  {
    template: "document_rejected",
    data: { name: "Partner", documentType: "Aadhaar", reason: "Blurry scan" },
  },
  {
    template: "daily_digest_am",
    data: {
      name: "Account Manager",
      digestBody: formatCountLine("Profiles Pending your action", 5),
      dashboardUrl: `${base}/account-manager`,
    },
  },
  {
    template: "daily_digest_partner",
    data: {
      name: "Partner",
      digestBody: [
        formatDigestDayHeading(new Date("2026-09-12T00:00:00.000Z")),
        formatTable(["Jobs Assigned", "Super High Priority Jobs"], [["12", "5"]]),
      ].join("\n"),
      dashboardUrl: `${base}/partner`,
    },
  },
  {
    template: "daily_digest_admin",
    data: {
      name: "Chief",
      digestBody: formatTable(
        ["Pending Review", "Being Submitted to Client", "Interviewing", "Selects"],
        [["8", "29", "6", "0"]],
      ),
      dashboardUrl: `${base}/super-admin`,
    },
  },
];

const ALL_TEMPLATES = Object.keys(DEFAULT_SUBJECTS) as EmailTemplateId[];

test("every email template has a workflow fixture", () => {
  const covered = new Set(TEMPLATE_FIXTURES.map((row) => row.template));
  for (const template of ALL_TEMPLATES) {
    assert.ok(covered.has(template), `missing fixture for ${template}`);
  }
});

for (const fixture of TEMPLATE_FIXTURES) {
  test(`email workflow renders ${fixture.template}`, () => {
    const subject = renderSubject(fixture.template, fixture.data);
    const text = renderBody(fixture.template, fixture.data);
    const html = renderOvatoEmailHtml(text);

    assert.ok(subject.trim().length > 0, "subject should not be empty");
    assert.ok(text.trim().length > 0, "body should not be empty");
    assert.match(html, new RegExp(LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /<img[^>]+alt="OVATO\.ai"/);
    assert.doesNotMatch(html, /localhost/);
    assert.match(html, /OVATO\.ai by Talent Socio/);
  });
}

test("client_details_updated email includes structured change table in HTML", () => {
  const fixture = TEMPLATE_FIXTURES.find(
    (row) => row.template === "client_details_updated",
  )!;
  const html = renderOvatoEmailHtml(renderBody(fixture.template, fixture.data));

  assert.match(html, /<table[^>]*>/);
  assert.match(html, /CL_001/);
  assert.match(html, /On hold/);
  assert.match(html, /Happy Hiring!!!/);
  assert.match(html, /Open dashboard<\/a>/);
});
