import { submissionStatusDisplayLabel } from "@/features/shared/entities";
import type { Payout } from "@/features/payouts/types";
import { PAYOUT_STATUS_LABELS } from "@/features/payouts/types";
import type { Submission } from "@/features/submissions/types";
import {
  buildCsvContent,
  csvFilename,
  formatCsvCell,
} from "@/lib/export/csv";
import { formatCurrency, formatDate } from "@/lib/utils";

export type CandidateCsvAudience = "partner" | "account_manager";

type CsvColumn = {
  header: string;
  value: (row: Submission, payout?: Payout | null) => string;
};

function partnerColumns(): CsvColumn[] {
  return [
    {
      header: "Candidate ID",
      value: (row) => formatCsvCell(row.submissionCode),
    },
    {
      header: "Candidate Name",
      value: (row) => formatCsvCell(row.candidateName),
    },
    {
      header: "Email",
      value: (row) => formatCsvCell(row.email),
    },
    {
      header: "Phone",
      value: (row) => formatCsvCell(row.phone),
    },
    {
      header: "Job ID",
      value: (row) => formatCsvCell(row.jobCode),
    },
    {
      header: "Job Title",
      value: (row) => formatCsvCell(row.jobTitle),
    },
    {
      header: "Client",
      value: (row) =>
        formatCsvCell(row.clientCode?.trim() || row.clientName),
    },
    {
      header: "Status",
      value: (row) => formatCsvCell(submissionStatusDisplayLabel(row)),
    },
    {
      header: "Interview Stage",
      value: (row) => formatCsvCell(row.interviewStage),
    },
    {
      header: "Submitted",
      value: (row) =>
        formatCsvCell(row.submissionDate ? formatDate(row.submissionDate) : ""),
    },
    {
      header: "LinkedIn",
      value: (row) => formatCsvCell(row.linkedIn),
    },
    {
      header: "Payout Status",
      value: (_row, payout) =>
        formatCsvCell(payout ? PAYOUT_STATUS_LABELS[payout.payoutStatus] : ""),
    },
    {
      header: "Payout Amount",
      value: (_row, payout) =>
        formatCsvCell(
          payout?.amount != null
            ? formatCurrency(payout.amount, payout.currency || "INR")
            : "",
        ),
    },
    {
      header: "Internal Feedback",
      value: (row) => formatCsvCell(row.internalFeedback),
    },
  ];
}

function accountManagerColumns(): CsvColumn[] {
  return [
    {
      header: "Candidate ID",
      value: (row) => formatCsvCell(row.submissionCode),
    },
    {
      header: "Candidate Name",
      value: (row) => formatCsvCell(row.candidateName),
    },
    {
      header: "Email",
      value: (row) => formatCsvCell(row.email),
    },
    {
      header: "Phone",
      value: (row) => formatCsvCell(row.phone),
    },
    {
      header: "Job ID",
      value: (row) => formatCsvCell(row.jobCode),
    },
    {
      header: "Job Title",
      value: (row) => formatCsvCell(row.jobTitle),
    },
    {
      header: "Client ID",
      value: (row) =>
        formatCsvCell(row.clientCode?.trim() || row.clientName),
    },
    {
      header: "Partner Code",
      value: (row) => formatCsvCell(row.partnerCode),
    },
    {
      header: "Status",
      value: (row) => formatCsvCell(submissionStatusDisplayLabel(row)),
    },
    {
      header: "Interview Stage",
      value: (row) => formatCsvCell(row.interviewStage),
    },
    {
      header: "Submitted",
      value: (row) =>
        formatCsvCell(row.submissionDate ? formatDate(row.submissionDate) : ""),
    },
    {
      header: "LinkedIn",
      value: (row) => formatCsvCell(row.linkedIn),
    },
    {
      header: "Screening Notes",
      value: (row) => formatCsvCell(row.remarks),
    },
    {
      header: "Internal Feedback",
      value: (row) => formatCsvCell(row.internalFeedback),
    },
  ];
}

export function buildCandidatesCsvContent(input: {
  rows: Submission[];
  audience: CandidateCsvAudience;
  payoutsBySubmission?: Record<string, Payout>;
}): string {
  const columns =
    input.audience === "partner"
      ? partnerColumns()
      : accountManagerColumns();

  const csvRows = input.rows.map((row) => {
    const payout = input.payoutsBySubmission?.[row.id] ?? null;
    return columns.map((column) => column.value(row, payout));
  });

  return buildCsvContent(
    columns.map((column) => column.header),
    csvRows,
  );
}

export function buildCandidatesCsvFilename(input: {
  audience: CandidateCsvAudience;
  jobCode?: string | null;
}): string {
  const prefix =
    input.audience === "partner" ? "my-candidates" : "candidates";
  if (input.jobCode?.trim()) {
    return csvFilename(`${prefix}-${input.jobCode.trim()}`);
  }
  return csvFilename(prefix);
}
