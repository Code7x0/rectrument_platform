"use client";

import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import type { Submission } from "@/features/submissions/types";
import { formatDate } from "@/lib/utils";

interface PartnerSubmissionsTabProps {
  submissions: Submission[];
}

/**
 * Reuses submission status badge + card list pattern (no tables).
 */
export function PartnerSubmissionsTab({
  submissions,
}: PartnerSubmissionsTabProps) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="No submissions"
        description="Candidate submissions from this partner will appear here."
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
                {row.jobTitle ?? "Job"} · {row.submissionCode}
              </p>
            </div>
            <SubmissionStatusBadge status={row.status} />
          </div>
          <p className="mt-3 text-xs text-[#94A3B8]">
            Submitted{" "}
            {row.submissionDate ? formatDate(row.submissionDate) : "—"}
          </p>
        </article>
      ))}
    </div>
  );
}
