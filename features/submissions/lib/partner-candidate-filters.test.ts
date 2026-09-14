import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Submission } from "@/features/submissions/types";
import {
  filterPartnerCandidateRows,
  sortSubmissionsByLastUpdated,
} from "@/features/submissions/lib/partner-candidate-filters";

function submission(partial: Partial<Submission> & { id: string }): Submission {
  return {
    id: partial.id,
    submissionCode: partial.submissionCode ?? null,
    candidateId: partial.candidateId ?? partial.id,
    candidateName: partial.candidateName ?? "Candidate",
    resumeUrl: null,
    resumeFilename: null,
    linkedIn: null,
    email: null,
    phone: null,
    jobId: partial.jobId ?? "job_1",
    jobTitle: partial.jobTitle ?? "Engineer",
    jobCode: partial.jobCode ?? null,
    clientId: partial.clientId ?? null,
    clientName: partial.clientName ?? null,
    clientCode: partial.clientCode ?? null,
    jobPriority: null,
    allocationId: partial.allocationId ?? "alloc_1",
    partnerId: partial.partnerId ?? "partner_1",
    partnerName: null,
    partnerCode: null,
    submissionDate: partial.submissionDate ?? "2026-01-01T00:00:00.000Z",
    lastActivityAt: partial.lastActivityAt ?? null,
    status: partial.status ?? "submitted",
    airtableStatus: partial.airtableStatus ?? "Submitted",
    remarks: null,
    interviewStage: partial.interviewStage ?? null,
    internalFeedback: null,
    wantsSecondLevelReview: false,
    secondLevelReviewLabel: null,
  };
}

describe("partner candidate filters", () => {
  it("sorts by last activity descending", () => {
    const rows = sortSubmissionsByLastUpdated([
      submission({
        id: "a",
        lastActivityAt: "2026-02-01T00:00:00.000Z",
      }),
      submission({
        id: "b",
        lastActivityAt: "2026-03-01T00:00:00.000Z",
      }),
    ]);
    assert.equal(rows[0]?.id, "b");
  });

  it("filters by interview stage and search", () => {
    const rows = filterPartnerCandidateRows(
      [
        submission({
          id: "a",
          candidateName: "Alice",
          interviewStage: "Screening",
          clientId: "client_1",
          clientName: "Acme",
        }),
        submission({
          id: "b",
          candidateName: "Bob",
          interviewStage: "Offer Extended",
          clientId: "client_2",
          clientName: "Beta",
        }),
      ],
      {
        search: "alice",
        status: "all",
        clientId: "all",
        jobId: "all",
        interviewStage: "Screening",
      },
      () => true,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "a");
  });
});
