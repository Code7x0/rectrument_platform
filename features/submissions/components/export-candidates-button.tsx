"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Payout } from "@/features/payouts/types";
import {
  buildCandidatesCsvContent,
  buildCandidatesCsvFilename,
  type CandidateCsvAudience,
} from "@/features/submissions/lib/export-candidates-csv";
import type { Submission } from "@/features/submissions/types";
import { downloadCsvFile } from "@/lib/export/csv";

interface ExportCandidatesButtonProps {
  rows: Submission[];
  audience: CandidateCsvAudience;
  payoutsBySubmission?: Record<string, Payout>;
  jobCode?: string | null;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function ExportCandidatesButton({
  rows,
  audience,
  payoutsBySubmission,
  jobCode = null,
  disabled = false,
  size = "default",
  variant = "outline",
}: ExportCandidatesButtonProps) {
  function handleExport() {
    if (rows.length === 0) {
      toast.error("No candidates to export for the current filters");
      return;
    }

    try {
      const content = buildCandidatesCsvContent({
        rows,
        audience,
        payoutsBySubmission,
      });
      downloadCsvFile(
        buildCandidatesCsvFilename({ audience, jobCode }),
        content,
      );
      toast.success(`Exported ${rows.length} candidate${rows.length === 1 ? "" : "s"}`);
    } catch (error) {
      console.error("[export] candidate CSV failed", error);
      toast.error("Unable to export candidates");
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || rows.length === 0}
      onClick={handleExport}
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
