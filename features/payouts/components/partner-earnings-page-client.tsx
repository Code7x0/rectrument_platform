"use client";

import { Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import { WorkspaceMetricCard } from "@/features/shared/workspace";
import type { PartnerEarningsSummary, Payout } from "@/features/payouts/types";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PartnerEarningsPageClientProps {
  payouts: Payout[];
  summary: PartnerEarningsSummary;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PartnerEarningsPageClient({
  payouts,
  summary,
  breadcrumbs,
}: PartnerEarningsPageClientProps) {
  const recent = payouts.slice(0, 8);

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="My Earnings"
        description="Track payout eligibility and payments for your candidate submissions — no need to chase updates."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <WorkspaceMetricCard
          label="Total Earnings"
          value={formatCurrency(summary.totalEarnings, summary.currency)}
          hint="Paid and completed payouts"
          className="bg-gradient-to-br from-white to-[#F8FAFC]"
        />
        <WorkspaceMetricCard
          label="Pending Earnings"
          value={formatCurrency(summary.pendingEarnings, summary.currency)}
          hint="Eligible or processing"
        />
        <WorkspaceMetricCard
          label="Paid Earnings"
          value={formatCurrency(summary.paidEarnings, summary.currency)}
          hint="Successfully paid out"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Recent earnings
          </h2>
          <p className="text-xs text-[#94A3B8]">
            {payouts.length} submission{payouts.length === 1 ? "" : "s"}
          </p>
        </div>

        {payouts.length === 0 ? (
          <EmptyState
            title="No earnings yet"
            description="Submit candidates for allocated jobs. Payouts appear here as recruitment progresses."
            icon={<Wallet className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-3">
            {recent.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#0F172A]">
                      {row.candidateName ?? "Candidate"}
                    </h3>
                    <p className="mt-0.5 text-sm text-[#64748B]">
                      {row.jobTitle ?? "Job"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#0F172A]">
                      {row.amount != null && row.amount > 0
                        ? formatCurrency(row.amount, row.currency)
                        : "—"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">{row.payoutCode}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {row.recruitmentStatus ? (
                    <SubmissionStatusBadge status={row.recruitmentStatus} />
                  ) : null}
                  <PayoutStatusBadge status={row.payoutStatus} />
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#94A3B8]">
                  <span>
                    Submitted payout track ·{" "}
                    {row.eligibleDate
                      ? `Eligible ${formatDate(row.eligibleDate)}`
                      : "Not eligible yet"}
                  </span>
                  {row.paidDate ? (
                    <span>Paid {formatDate(row.paidDate)}</span>
                  ) : null}
                  {row.lastUpdated ? (
                    <span>Updated {formatDateTime(row.lastUpdated)}</span>
                  ) : null}
                </div>

                {row.payoutStatus === "not_eligible" &&
                row.recruitmentStatus === "rejected" ? (
                  <p className="mt-3 text-xs text-[#64748B]">
                    This candidate was rejected — payout remains not eligible.
                  </p>
                ) : null}
                {row.payoutStatus === "eligible" ||
                row.payoutStatus === "processing" ? (
                  <p className="mt-3 text-xs text-[#64748B]">
                    Payment is being processed by your account manager.
                  </p>
                ) : null}
              </article>
            ))}

            {payouts.length > recent.length ? (
              <p className="text-center text-xs text-[#94A3B8]">
                Showing {recent.length} of {payouts.length} earnings records
              </p>
            ) : null}
          </div>
        )}
      </section>
    </ContentContainer>
  );
}
