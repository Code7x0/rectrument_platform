import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReclaimAvailability,
  getJobClaimReclaimHours,
  isReclaimAvailable,
} from "@/features/job-claims/lib/reclaim";

test("getJobClaimReclaimHours defaults to 48 and respects env", () => {
  const prev = process.env.JOB_CLAIM_RECLAIM_HOURS;
  delete process.env.JOB_CLAIM_RECLAIM_HOURS;
  assert.equal(getJobClaimReclaimHours(), 48);
  process.env.JOB_CLAIM_RECLAIM_HOURS = "24";
  assert.equal(getJobClaimReclaimHours(), 24);
  process.env.JOB_CLAIM_RECLAIM_HOURS = "0";
  assert.equal(getJobClaimReclaimHours(), 0);
  if (prev === undefined) {
    delete process.env.JOB_CLAIM_RECLAIM_HOURS;
  } else {
    process.env.JOB_CLAIM_RECLAIM_HOURS = prev;
  }
});

test("isReclaimAvailable and formatReclaimAvailability", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");
  assert.equal(isReclaimAvailable(null, now), true);
  assert.equal(
    isReclaimAvailable("2026-08-14T11:00:00.000Z", now),
    true,
  );
  assert.equal(
    isReclaimAvailable("2026-08-14T18:00:00.000Z", now),
    false,
  );
  assert.equal(formatReclaimAvailability(null, now), "Reclaim available");
  assert.match(
    formatReclaimAvailability("2026-08-14T18:00:00.000Z", now),
    /Available to reclaim in 6 hours/,
  );
});
