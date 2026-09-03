import assert from "node:assert/strict";
import test from "node:test";

import type { SubmissionEntity } from "@/features/shared/entities";

import { isPayoutVisibleRecruitment } from "./payout-recruitment-gate";

function row(
  airtableStatus: string | null,
  status: SubmissionEntity["status"] = "internal_review",
): Pick<SubmissionEntity, "status" | "airtableStatus"> {
  return { status, airtableStatus };
}

test("payout tab includes Selected, Offered, and Joined only", () => {
  assert.equal(isPayoutVisibleRecruitment(row("Selected", "offer")), true);
  assert.equal(isPayoutVisibleRecruitment(row("Offered", "offer")), true);
  assert.equal(isPayoutVisibleRecruitment(row("Joined", "joined")), true);
});

test("payout tab excludes interviewing and earlier pipeline stages", () => {
  assert.equal(isPayoutVisibleRecruitment(row("Interviewing", "interview")), false);
  assert.equal(isPayoutVisibleRecruitment(row("Pending Review", "submitted")), false);
  assert.equal(
    isPayoutVisibleRecruitment(row("Internal Screening in Progress", "internal_review")),
    false,
  );
  assert.equal(
    isPayoutVisibleRecruitment(row("Being Submitted to Client ", "client_review")),
    false,
  );
  assert.equal(isPayoutVisibleRecruitment(row("Rejected Resume Review-TS", "rejected")), false);
});
