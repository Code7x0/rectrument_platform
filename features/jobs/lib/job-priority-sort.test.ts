import assert from "node:assert/strict";
import test from "node:test";

import { compareJobsByPriorityThenOpenDate } from "./job-priority-sort";
import type { Job } from "@/features/jobs/types";

function job(
  partial: Partial<Job> & Pick<Job, "id" | "title" | "priority">,
): Job {
  return {
    jobCode: "",
    clientId: null,
    clientName: null,
    clientCode: null,
    accountManagerId: null,
    accountManagerIds: [],
    accountManagerName: null,
    accountManagerUnassigned: false,
    hiringManager: null,
    description: null,
    documents: [],
    location: null,
    workMode: null,
    employmentType: null,
    experience: null,
    salary: null,
    possiblePayout: null,
    openPositions: null,
    skills: [],
    status: "open",
    notes: null,
    department: null,
    interviewProcess: null,
    seniorityLevel: null,
    createdById: null,
    createdAt: null,
    startDate: null,
    postedDate: null,
    ...partial,
  };
}

test("sorts by priority then posted date", () => {
  const jobs = [
    job({
      id: "low-old",
      title: "Low Old",
      priority: "low",
      postedDate: "2024-01-01",
    }),
    job({
      id: "urgent-new",
      title: "Urgent New",
      priority: "urgent",
      postedDate: "2024-06-01",
    }),
    job({
      id: "urgent-old",
      title: "Urgent Old",
      priority: "urgent",
      postedDate: "2024-01-01",
    }),
    job({
      id: "high",
      title: "High",
      priority: "high",
      postedDate: "2024-03-01",
    }),
  ];

  const sorted = [...jobs].sort(compareJobsByPriorityThenOpenDate);
  assert.deepEqual(
    sorted.map((row) => row.id),
    ["urgent-old", "urgent-new", "high", "low-old"],
  );
});
