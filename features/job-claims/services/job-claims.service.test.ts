import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { toPartnerAvailableJob } from "@/features/job-claims/services/job-claims.service";
import type { Job } from "@/features/jobs/types";

function sampleJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "recJob1",
    jobCode: "RED_001",
    title: "Lab Operations",
    clientId: "recClientSecret",
    clientName: "Secret Client Name",
    clientCode: "SEC",
    accountManagerId: "recAm1",
    accountManagerIds: ["recAm1"],
    accountManagerName: "AM Person",
    accountManagerUnassigned: false,
    hiringManager: "Hidden HM",
    description: "Additional comments text",
    documents: [
      {
        label: "Job Description",
        url: "https://example.com/jd.pdf",
        filename: "jd.pdf",
      },
      {
        label: "Sample Profiling",
        url: "https://example.com/sample.pdf",
        filename: "sample.pdf",
      },
    ],
    location: "Bengaluru",
    workMode: "Hybrid",
    employmentType: "full_time",
    experience: "3-5 years",
    salary: "10-15 LPA",
    possiblePayout: "8%",
    priority: "high",
    openPositions: null,
    skills: ["Lab"],
    status: "open",
    notes: "notes",
    department: "Ops",
    interviewProcess: "R1 KYC",
    seniorityLevel: "Mid",
    createdById: null,
    createdAt: null,
    startDate: null,
    postedDate: null,
    ...overrides,
  };
}

test("toPartnerAvailableJob strips client identity fields", () => {
  const sanitized = toPartnerAvailableJob(sampleJob(), {
    daysOfWorking: "5 days",
    claimState: "available",
    claimId: null,
    claimRequestedAt: null,
    claimRejectionReason: null,
  });

  assert.equal(sanitized.title, "Lab Operations");
  assert.equal(sanitized.jobCode, "RED_001");
  assert.equal(sanitized.workMode, "Hybrid");
  assert.equal(sanitized.daysOfWorking, "5 days");
  assert.equal(sanitized.possiblePayout, "8%");
  assert.equal(sanitized.interviewProcess, "R1 KYC");
  assert.equal(sanitized.documents.length, 2);

  const json = JSON.stringify(sanitized);
  assert.equal(json.includes("Secret Client Name"), false);
  assert.equal(json.includes("recClientSecret"), false);
  assert.equal(json.includes("Hidden HM"), false);
  assert.equal(json.includes("AM Person"), false);
  assert.equal(json.includes("clientId"), false);
  assert.equal(json.includes("clientName"), false);
});

test("claim store prevents duplicate pending claims", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "job-claims-"));
  const file = path.join(dir, "job-claims.json");
  process.env.JOB_CLAIMS_STORE_PATH = file;

  // Fresh module state for store path — import after env set.
  const repo = await import(
    "@/features/job-claims/repositories/job-claims.repository"
  );

  const first = await repo.insertJobClaim({
    partnerId: "partnerA",
    jobId: "job1",
    accountManagerId: "am1",
  });
  assert.equal(first.status, "pending");

  await assert.rejects(
    () =>
      repo.insertJobClaim({
        partnerId: "partnerA",
        jobId: "job1",
        accountManagerId: "am1",
      }),
    /pending claim/i,
  );

  const otherPartner = await repo.insertJobClaim({
    partnerId: "partnerB",
    jobId: "job1",
    accountManagerId: "am1",
  });
  assert.equal(otherPartner.status, "pending");

  const rejected = await repo.updateJobClaimStatus(first.id, {
    status: "rejected",
    reviewedByUserId: "userAm",
    rejectionReason: "Not a fit",
  });
  assert.equal(rejected.status, "rejected");

  const reclaim = await repo.insertJobClaim({
    partnerId: "partnerA",
    jobId: "job1",
    accountManagerId: "am1",
  });
  assert.equal(reclaim.status, "pending");
});
