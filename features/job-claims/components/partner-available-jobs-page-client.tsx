"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { claimJobAction } from "@/features/job-claims/actions/job-claims.actions";
import {
  AvailableJobCard,
  AvailableJobDetailBody,
} from "@/features/job-claims/components/available-job-card";
import type { PartnerAvailableJob } from "@/features/job-claims/types";

interface PartnerAvailableJobsPageClientProps {
  jobs: PartnerAvailableJob[];
}

export function PartnerAvailableJobsPageClient({
  jobs: initialJobs,
}: PartnerAvailableJobsPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [selected, setSelected] = useState<PartnerAvailableJob | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  async function handleClaim(job: PartnerAvailableJob) {
    if (claimingId) {
      return;
    }
    setClaimingId(job.id);
    try {
      const result = await claimJobAction(job.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Claim request submitted", {
        description: "Status is Claim Pending until an Account Manager reviews it.",
      });
      setJobs((current) =>
        current.map((row) =>
          row.id === job.id
            ? {
                ...row,
                claimState: "pending",
                claimId: result.data.id,
                claimRequestedAt: result.data.requestedAt,
                claimRejectionReason: null,
              }
            : row,
        ),
      );
      setSelected((current) =>
        current?.id === job.id
          ? {
              ...current,
              claimState: "pending",
              claimId: result.data.id,
              claimRequestedAt: result.data.requestedAt,
              claimRejectionReason: null,
            }
          : current,
      );
      router.refresh();
    } finally {
      setClaimingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No available jobs right now"
        description="When open roles are ready to claim, they appear here. Your authorized work stays under Assigned Jobs."
        icon={<Briefcase className="h-5 w-5" />}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {jobs.map((job) => (
          <AvailableJobCard
            key={job.id}
            job={job}
            claiming={claimingId === job.id}
            onView={setSelected}
            onClaim={handleClaim}
          />
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.title ?? "Job details"}
        stickyFooter={
          selected ? (
            selected.claimState === "available" ||
            selected.claimState === "rejected" ? (
              <Button
                type="button"
                className="w-full"
                disabled={claimingId === selected.id}
                aria-busy={claimingId === selected.id}
                onClick={() => void handleClaim(selected)}
              >
                {claimingId === selected.id ? "Submitting…" : "Claim Job"}
              </Button>
            ) : (
              <Button type="button" className="w-full" variant="secondary" disabled>
                {selected.claimState === "pending"
                  ? "Claim Pending"
                  : "Assigned"}
              </Button>
            )
          ) : null
        }
      >
        {selected ? (
          <AvailableJobDetailBody
            job={selected}
            claiming={claimingId === selected.id}
            onClaim={handleClaim}
            hideInlineClaim
          />
        ) : null}
      </DetailDrawer>
    </>
  );
}
