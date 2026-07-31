"use client";

import Link from "next/link";
import { ClipboardList, ExternalLink, FileText, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import type { Payout } from "@/features/payouts/types";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import type { Submission } from "@/features/submissions/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PartnerSubmissionsPageClientProps {
  submissions: Submission[];
  payoutsBySubmission?: Record<string, Payout>;
  breadcrumbs: Array<{ label: string; href?: string }>;
  filterJobId?: string | null;
  filterJobLabel?: string | null;
}

export function PartnerSubmissionsPageClient({
  submissions,
  payoutsBySubmission = {},
  breadcrumbs,
  filterJobId = null,
  filterJobLabel = null,
}: PartnerSubmissionsPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="My Candidates"
        description="Profiles you have submitted. Reviews appear when Account Managers advance status."
      />

      {filterJobId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
          <p className="text-sm text-[#1E3A8A]">
            Showing submissions for{" "}
            <span className="font-semibold">
              {filterJobLabel ?? "this requisition"}
            </span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/partner/candidates">
              <X className="h-3.5 w-3.5" />
              Clear filter
            </Link>
          </Button>
        </div>
      ) : null}

      {submissions.length === 0 ? (
        <EmptyState
          title={filterJobId ? "No submissions for this job" : "No submissions yet"}
          description={
            filterJobId
              ? "Submit a candidate from Assigned Jobs for this requisition."
              : "Open Assigned Jobs, select a job, and submit a candidate."
          }
          icon={<ClipboardList className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((row) => {
            const payout = payoutsBySubmission[row.id];
            return (
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
                      {row.jobCode ? `${row.jobCode} · ` : ""}
                      {row.jobTitle ?? "Job"}
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
                  <div className="flex flex-wrap gap-2">
                    <SubmissionStatusBadge status={row.status} />
                    <PayoutStatusBadge
                      status={payout?.payoutStatus ?? "not_eligible"}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#94A3B8]">
                  <span>
                    Submitted{" "}
                    {row.submissionDate ? formatDate(row.submissionDate) : "—"}
                  </span>
                  {payout?.amount != null && payout.amount > 0 ? (
                    <span>
                      {formatCurrency(payout.amount, payout.currency)}
                    </span>
                  ) : null}
                  {payout?.lastUpdated ? (
                    <span>Updated {formatDateTime(payout.lastUpdated)}</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ContentContainer>
  );
}
