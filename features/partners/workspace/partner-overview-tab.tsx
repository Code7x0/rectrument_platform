import {
  PartnerStatusBadge,
  PartnerVerificationBadge,
} from "@/features/partners/components/partner-status-badge";
import {
  WorkspaceMetricCard,
  WorkspaceSection,
} from "@/features/shared/workspace";
import type {
  Partner,
  PartnerPerformanceStats,
} from "@/features/partners/types";
import { displayBusinessId } from "@/lib/business-ids";

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A]">{value || "—"}</p>
    </div>
  );
}

interface PartnerOverviewTabProps {
  partner: Partner;
  performance: PartnerPerformanceStats;
  /** Admin sees identity; Account Managers see Partner ID only. */
  showIdentity?: boolean;
}

export function PartnerOverviewTab({
  partner,
  performance,
  showIdentity = true,
}: PartnerOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <PartnerStatusBadge status={partner.status} />
        <PartnerVerificationBadge status={partner.verificationStatus} />
        <span className="text-sm text-[#64748B]">
          {displayBusinessId(partner.partnerCode)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <WorkspaceMetricCard
          label="Active Jobs"
          value={performance.activeJobs}
        />
        <WorkspaceMetricCard
          label="Profiles Submitted"
          value={performance.profilesSubmitted}
        />
        <WorkspaceMetricCard
          label="Interviews"
          value={performance.interviews}
        />
        <WorkspaceMetricCard label="Offers" value={performance.offers} />
        <WorkspaceMetricCard
          label="Joined"
          value={performance.joinedCandidates}
        />
      </div>

      <WorkspaceSection
        title={
          showIdentity
            ? "Talent Partner Information"
            : "Operational Profile"
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            label="Partner Code"
            value={displayBusinessId(partner.partnerCode)}
          />
          {showIdentity ? (
            <>
              <Detail label="Company" value={partner.companyName} />
              <Detail label="Contact Person" value={partner.contactName} />
              <Detail label="Email" value={partner.email} />
              <Detail label="Phone" value={partner.phone} />
              <Detail label="Revenue Share" value={partner.revenueShare} />
            </>
          ) : null}
          <Detail label="Specialization" value={partner.specialization} />
          <Detail
            label="Identity Visibility"
            value={
              partner.identityVisibility === "public" ? "Public" : "Private"
            }
          />
          <Detail
            label="Rating"
            value={partner.rating != null ? partner.rating : null}
          />
          <Detail label="Status" value={partner.status} />
          <Detail
            label="Verification Status"
            value={partner.verificationStatus}
          />
        </div>
        {showIdentity ? (
          <div className="mt-4">
            <Detail label="Notes" value={partner.notes} />
          </div>
        ) : null}
      </WorkspaceSection>
    </div>
  );
}
