import type { Submission } from "@/features/submissions/types";

export function resolveSubmissionLastUpdated(submission: Submission): string {
  const values = [
    submission.lastActivityAt,
    submission.submissionDate,
  ].filter((value): value is string => Boolean(value?.trim()));
  if (values.length === 0) {
    return "";
  }
  return values.sort((a, b) => b.localeCompare(a))[0] ?? "";
}

export function sortSubmissionsByLastUpdated(
  rows: Submission[],
): Submission[] {
  return [...rows].sort((a, b) =>
    resolveSubmissionLastUpdated(b).localeCompare(
      resolveSubmissionLastUpdated(a),
    ),
  );
}

export interface PartnerCandidateFilterState {
  search: string;
  status: string;
  clientId: string;
  jobId: string;
  interviewStage: string;
}

export function collectPartnerCandidateFilterOptions(rows: Submission[]) {
  const clients = new Map<string, string>();
  const jobs = new Map<string, string>();
  const interviewStages = new Set<string>();

  for (const row of rows) {
    if (row.clientId && (row.clientName || row.clientCode)) {
      clients.set(
        row.clientId,
        row.clientName?.trim() ||
          row.clientCode?.trim() ||
          row.clientId,
      );
    }
    if (row.jobId && (row.jobTitle || row.jobCode)) {
      jobs.set(
        row.jobId,
        [row.jobCode, row.jobTitle].filter(Boolean).join(" · ") ||
          row.jobId,
      );
    }
    const stage = row.interviewStage?.trim();
    if (stage) {
      interviewStages.add(stage);
    }
  }

  return {
    clients: [...clients.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    jobs: [...jobs.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    interviewStages: [...interviewStages].sort((a, b) => a.localeCompare(b)),
  };
}

function matchesSearch(row: Submission, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    row.candidateName,
    row.jobTitle,
    row.jobCode,
    row.clientName,
    row.clientCode,
    row.submissionCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterPartnerCandidateRows(
  rows: Submission[],
  filters: PartnerCandidateFilterState,
  matchesStatus: (row: Submission, status: string) => boolean,
): Submission[] {
  let next = rows;

  if (filters.status !== "all") {
    next = next.filter((row) => matchesStatus(row, filters.status));
  }
  if (filters.clientId !== "all") {
    next = next.filter((row) => row.clientId === filters.clientId);
  }
  if (filters.jobId !== "all") {
    next = next.filter((row) => row.jobId === filters.jobId);
  }
  if (filters.interviewStage !== "all") {
    next = next.filter(
      (row) =>
        (row.interviewStage ?? "").trim() === filters.interviewStage.trim(),
    );
  }
  if (filters.search.trim()) {
    next = next.filter((row) => matchesSearch(row, filters.search));
  }

  return sortSubmissionsByLastUpdated(next);
}
