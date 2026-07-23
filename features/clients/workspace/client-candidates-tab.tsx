"use client";

import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  SUBMISSION_STATUS_LABELS,
  type Submission,
} from "@/features/submissions/types";
import { formatDate } from "@/lib/utils";

interface ClientCandidatesTabProps {
  submissions: Submission[];
}

export function ClientCandidatesTab({
  submissions,
}: ClientCandidatesTabProps) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="No candidates yet"
        description="Submissions against this client’s jobs will appear here."
        icon={<ClipboardList className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((row) => (
        <article
          key={row.id}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#0F172A]">
                {row.candidateName ?? "Candidate"}
              </h3>
              <p className="text-sm text-[#64748B]">
                {row.jobTitle ?? "Job"}
                {row.partnerName ? ` · ${row.partnerName}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#334155]">
              {SUBMISSION_STATUS_LABELS[row.status]}
            </span>
          </div>
          <p className="mt-3 text-xs text-[#94A3B8]">
            {row.submissionCode}
            {" · Submitted "}
            {row.submissionDate ? formatDate(row.submissionDate) : "—"}
          </p>
        </article>
      ))}
    </div>
  );
}
