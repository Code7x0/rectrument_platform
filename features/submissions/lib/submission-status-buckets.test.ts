import assert from "node:assert/strict";
import test from "node:test";

import {
  candidatesListHref,
  matchesSubmissionStatusGroup,
  parseStatusFilterParam,
  submissionExactStatusLabel,
} from "./submission-status-buckets";
import type { SubmissionEntity } from "@/features/shared/entities";

function row(
  airtableStatus: string | null,
  status: SubmissionEntity["status"] = "internal_review",
): Pick<SubmissionEntity, "status" | "airtableStatus"> {
  return { status, airtableStatus };
}

test("pending_review excludes Hold and Internal Screening", () => {
  assert.equal(
    matchesSubmissionStatusGroup(row("Pending Review", "submitted"), "pending_review"),
    true,
  );
  assert.equal(
    matchesSubmissionStatusGroup(row("Hold"), "pending_review"),
    false,
  );
  assert.equal(
    matchesSubmissionStatusGroup(
      row("Internal Screening in Progress"),
      "pending_review",
    ),
    false,
  );
});

test("internal_screening is exact screening only — not Hold", () => {
  assert.equal(
    matchesSubmissionStatusGroup(
      row("Internal Screening in Progress"),
      "internal_screening",
    ),
    true,
  );
  assert.equal(
    matchesSubmissionStatusGroup(row("Hold"), "internal_screening"),
    false,
  );
  assert.equal(
    matchesSubmissionStatusGroup(row("Interviewing", "interview"), "internal_screening"),
    false,
  );
  assert.equal(
    matchesSubmissionStatusGroup(
      row("Being Submitted to Client ", "client_review"),
      "internal_screening",
    ),
    false,
  );
});

test("hold is its own group", () => {
  assert.equal(matchesSubmissionStatusGroup(row("Hold"), "hold"), true);
  assert.equal(
    matchesSubmissionStatusGroup(row("Pending Review", "submitted"), "hold"),
    false,
  );
});

test("offers includes Selected and Offered", () => {
  assert.equal(
    matchesSubmissionStatusGroup(row("Selected", "offer"), "offers"),
    true,
  );
  assert.equal(
    matchesSubmissionStatusGroup(row("Offered", "offer"), "offers"),
    true,
  );
});

test("fallback label uses domain when airtableStatus missing", () => {
  assert.equal(
    submissionExactStatusLabel(row(null, "submitted")),
    "Pending Review",
  );
});

test("candidatesListHref encodes statusGroup and multi status", () => {
  assert.equal(
    candidatesListHref("/account-manager/candidates", {
      statusGroup: "pending_review",
    }),
    "/account-manager/candidates?statusGroup=pending_review",
  );
  assert.equal(
    candidatesListHref("/account-manager/candidates", {
      status: ["Selected", "Offered"],
    }),
    "/account-manager/candidates?status=Selected%7COffered",
  );
});

test("parseStatusFilterParam splits pipe-separated statuses", () => {
  assert.deepEqual(parseStatusFilterParam("Selected|Offered"), [
    "Selected",
    "Offered",
  ]);
});
