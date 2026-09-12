import assert from "node:assert/strict";
import test from "node:test";

/**
 * Mirrors listPartnerSubmissions extras filter — partners must not see
 * candidates on shared jobs unless explicitly linked to their account.
 */
function partnerExtrasVisible(
  row: { id: string; candidateId: string; partnerId: string | null; jobId: string },
  partnerId: string,
  linkedCandidateIds: Set<string>,
): boolean {
  if (row.partnerId?.trim() === partnerId) {
    return true;
  }
  return (
    linkedCandidateIds.has(row.id) || linkedCandidateIds.has(row.candidateId)
  );
}

test("partner extras exclude orphan rows on shared jobs", () => {
  const partnerA = "partner-a";
  const linked = new Set<string>();

  const orphanOnSharedJob = {
    id: "sub-orphan",
    candidateId: "cand-other",
    partnerId: "",
    jobId: "job-shared",
  };

  assert.equal(
    partnerExtrasVisible(orphanOnSharedJob, partnerA, linked),
    false,
  );
});

test("partner extras include explicitly linked candidate ids", () => {
  const partnerA = "partner-a";
  const linked = new Set(["cand-owned"]);

  const legacyRow = {
    id: "sub-legacy",
    candidateId: "cand-owned",
    partnerId: "",
    jobId: "job-1",
  };

  assert.equal(partnerExtrasVisible(legacyRow, partnerA, linked), true);
});

test("partner extras never include another partner's direct submissions", () => {
  const partnerA = "partner-a";
  const linked = new Set<string>();

  const otherPartnerRow = {
    id: "sub-b",
    candidateId: "cand-b",
    partnerId: "partner-b",
    jobId: "job-1",
  };

  assert.equal(
    partnerExtrasVisible(otherPartnerRow, partnerA, linked),
    false,
  );
});
