"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { claimJobAction } from "@/features/job-claims/actions/job-claims.actions";
import {
  AvailableJobDetailBody,
  claimStateLabel,
} from "@/features/job-claims/components/available-job-card";
import type { PartnerAvailableJob } from "@/features/job-claims/types";

interface PartnerAvailableJobDetailPageClientProps {
  job: PartnerAvailableJob;
}

export function PartnerAvailableJobDetailPageClient({
  job: initialJob,
}: PartnerAvailableJobDetailPageClientProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    if (claiming) {
      return;
    }
    setClaiming(true);
    try {
      const result = await claimJobAction(job.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Claim request submitted", {
        description:
          "Status is Claim Pending until an Account Manager reviews it.",
      });
      setJob((current) => ({
        ...current,
        claimState: "pending",
        claimId: result.data.id,
        claimRequestedAt: result.data.requestedAt,
        claimRejectionReason: null,
        claimReclaimAvailableAt: null,
      }));
      router.refresh();
    } finally {
      setClaiming(false);
    }
  }

  const canClaim = job.claimState === "available" || job.claimState === "rejected";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <AvailableJobDetailBody
          job={job}
          claiming={claiming}
          hideInlineClaim
          onClaim={handleClaim}
        />
      </div>
      <div className="flex justify-end">
        {canClaim ? (
          <Button disabled={claiming} onClick={() => void handleClaim()}>
            {claiming
              ? "Submitting…"
              : job.claimState === "rejected"
                ? "Claim Again"
                : "Claim Job"}
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            {claimStateLabel(job.claimState)}
          </Button>
        )}
      </div>
    </div>
  );
}
