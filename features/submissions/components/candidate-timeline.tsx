"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { CandidateTimelineStep } from "@/features/submissions/lib/candidate-timeline";

const TONE_DOT: Record<CandidateTimelineStep["tone"], string> = {
  done: "bg-[#16A34A]",
  current: "bg-[#2563EB]",
  pending: "bg-[#CBD5E1]",
  attention: "bg-[#D97706]",
};

const TONE_LABEL: Record<CandidateTimelineStep["tone"], string> = {
  done: "text-[#0F172A]",
  current: "text-[#1D4ED8]",
  pending: "text-[#64748B]",
  attention: "text-[#B45309]",
};

export function CandidateTimeline({
  steps,
  className,
}: {
  steps: CandidateTimelineStep[];
  className?: string;
}) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 rounded-full",
                TONE_DOT[step.tone],
              )}
              aria-hidden
            />
            {index < steps.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-[#E2E8F0]" aria-hidden />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <p className={cn("text-sm font-medium", TONE_LABEL[step.tone])}>
              {step.label}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#94A3B8]">
              {step.at ? <span>{formatDate(step.at)}</span> : null}
              {step.detail ? <span>{step.detail}</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
