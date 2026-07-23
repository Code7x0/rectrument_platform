"use client";

import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import type { Payout } from "@/features/payouts/types";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import type { Submission } from "@/features/submissions/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PartnerSubmissionsPageClientProps {
  submissions: Submission[];
  payoutsBySubmission?: Record<string, Payout>;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PartnerSubmissionsPageClient({
  submissions,
  payoutsBySubmission = {},
  breadcrumbs,
}: PartnerSubmissionsPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="My Candidates"
        description="Profiles you have submitted. Reviews appear when Account Managers advance status."
      />

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Open My Work, select a job, and submit a candidate."
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
                    {row.jobTitle ?? "Job"} · {row.submissionCode}
                  </p>
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
