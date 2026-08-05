"use client";

import { ClipboardList, ExternalLink, FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  SUBMISSION_STATUS_LABELS,
  type Submission,
} from "@/features/submissions/types";
import { formatDate } from "@/lib/utils";

interface SubmissionsReadonlyPageClientProps {
  submissions: Submission[];
  breadcrumbs: Array<{ label: string; href?: string }>;
  title?: string;
  description?: string;
}

/** Admin / AM read-only view. Review workflow lands in Feature: AM Review Queue. */
export function SubmissionsReadonlyPageClient({
  submissions,
  breadcrumbs,
  title = "Candidates",
  description = "Submitted profiles for your scope. Open Resume or LinkedIn when available.",
}: SubmissionsReadonlyPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title={title} description={description} />

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Partner submissions will appear here."
          icon={<ClipboardList className="h-5 w-5" />}
        />
      ) : (
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
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {row.resumeUrl ? (
                      <a
                        href={row.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Resume
                      </a>
                    ) : null}
                    {row.linkedIn ? (
                      <a
                        href={row.linkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#334155]">
                  {SUBMISSION_STATUS_LABELS[row.status]}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#94A3B8]">
                {row.submissionCode ? `${row.submissionCode} · ` : ""}
                Submitted{" "}
                {row.submissionDate ? formatDate(row.submissionDate) : "—"}
              </p>
            </article>
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
