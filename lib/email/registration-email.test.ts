import assert from "node:assert/strict";
import { test } from "node:test";

import { flattenRegistrationEmailCell } from "@/lib/email/registration-email";
import { convertPlainEmailToHtml } from "@/services/email/layout";
import { renderBody } from "@/services/email/templates";

test("flattenRegistrationEmailCell collapses multiline skills into one line", () => {
  const flat = flattenRegistrationEmailCell(
    "Recruitment\nHiring\nTalent Acquisition\n\nSLA/KRA\nIT Services",
  );
  assert.ok(!flat.includes("\n"));
  assert.match(flat, /Recruitment/);
});

test("partner registration email renders as HTML table not loose headings", () => {
  const text = renderBody("partner_registration_submitted", {
    partnerName: "Belal Azmat",
    experience: "10+ years",
    specialization: "Recruitment, Hiring",
    email: "partner@example.com",
    approvalUrl: "https://ovato.ai/admin/approvals",
  });
  const html = convertPlainEmailToHtml(text);
  assert.match(html, /<table[^>]*>/);
  assert.match(html, /Belal Azmat/);
  assert.match(html, /partner@example.com/);
  assert.doesNotMatch(html, /<h3[^>]*>SLA\/KRA<\/h3>/);
});

test("job_assigned email uses sign-in redirect for partner jobs dashboard", () => {
  const base = "https://ovato.ai";
  const jobsUrl = `${base}/sign-in?redirect_url=${encodeURIComponent("/partner/jobs")}`;
  const text = renderBody("job_assigned", {
    jobTitle: "APD_005",
    jobsUrl,
  });
  assert.match(text, /sign-in\?redirect_url=%2Fpartner%2Fjobs/);
});
