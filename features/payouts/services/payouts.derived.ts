/**
 * Derive synthetic payouts from Candidates (Joined/Offered) + Jobs.Payout %
 * + optional paid/processing markers in Partners.Communications.
 */

import { findRecord, getRecords, updateRecord, type AirtableFields } from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  parsePayoutMarkers,
  upsertPayoutMarker,
  type PayoutMarker,
} from "@/lib/airtable/field-markers";
import {
  CANDIDATES_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
  SUBMISSIONS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import { mapSubmissionRecord } from "@/features/submissions/services/submissions.mapper";
import type { Payout, PayoutStatus } from "@/features/payouts/types";
import type { Submission } from "@/features/submissions/types";

const PAYOUT_STATUSES: PayoutStatus[] = [
  "not_eligible",
  "eligible",
  "processing",
  "paid",
  "completed",
];

function payoutStatusFromSubmission(
  status: Submission["status"],
): PayoutStatus {
  if (status === "joined") {
    return "eligible";
  }
  return "not_eligible";
}

function parseSalaryHint(salary: string | null): number | null {
  if (!salary) {
    return null;
  }
  const match = salary.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*L/i);
  if (match?.[1]) {
    return Number(match[1]) * 100_000;
  }
  const plain = salary.replace(/[^\d.]/g, "");
  const n = Number(plain);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asPayoutStatus(value: string): PayoutStatus | null {
  return PAYOUT_STATUSES.includes(value as PayoutStatus)
    ? (value as PayoutStatus)
    : null;
}

export async function derivePayoutsFromClientCrm(): Promise<Payout[]> {
  const candidatesTable = getAirtableTableName("candidatesTable");
  const jobsTable = getAirtableTableName("jobsTable");
  const partnersTable = getAirtableTableName("partnersTable");

  const [candidateRecords, jobRecords, partnerRecords] = await Promise.all([
    getRecords(candidatesTable, {
      sort: [
        { field: SUBMISSIONS_TABLE_FIELDS.submissionDate, direction: "desc" },
      ],
      maxRecords: 500,
    }),
    getRecords(jobsTable, {
      fields: [
        JOBS_TABLE_FIELDS.title,
        JOBS_TABLE_FIELDS.payoutPercent,
        JOBS_TABLE_FIELDS.salary,
      ],
    }),
    getRecords(partnersTable, {
      fields: ["Communications", PARTNERS_TABLE_FIELDS.partnerId],
    }),
  ]);

  const jobMeta = new Map<
    string,
    { title: string | null; payoutPct: number | null; salary: string | null }
  >();
  for (const job of jobRecords) {
    const fields = job.fields as AirtableFields;
    const pct = fields[JOBS_TABLE_FIELDS.payoutPercent];
    jobMeta.set(job.id, {
      title: asString(fields[JOBS_TABLE_FIELDS.title]),
      payoutPct: typeof pct === "number" ? pct : null,
      salary: asString(fields[JOBS_TABLE_FIELDS.salary]),
    });
  }

  const markerBySubmission = new Map<string, PayoutMarker>();
  for (const partner of partnerRecords) {
    const markers = parsePayoutMarkers(
      asString(partner.fields.Communications),
    );
    for (const marker of markers) {
      markerBySubmission.set(marker.submissionId, marker);
    }
  }

  const payouts: Payout[] = [];
  for (const record of candidateRecords) {
    try {
      const submission = mapSubmissionRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      });
      if (
        submission.status !== "joined" &&
        submission.status !== "offer" &&
        submission.status !== "interview" &&
        !markerBySubmission.has(submission.id)
      ) {
        continue;
      }
      const meta = jobMeta.get(submission.jobId);
      const salary = parseSalaryHint(meta?.salary ?? null);
      const estimated =
        salary != null && meta?.payoutPct != null
          ? Math.round(salary * meta.payoutPct)
          : null;
      const marker = markerBySubmission.get(submission.id);
      const markerStatus = marker
        ? asPayoutStatus(marker.status)
        : null;

      payouts.push({
        id: `derived_payout_${submission.id}`,
        payoutCode: `PAY-${submission.id.slice(-6)}`,
        submissionId: submission.id,
        partnerId: submission.partnerId,
        partnerCode: null,
        partnerName: null,
        jobId: submission.jobId,
        jobTitle: meta?.title ?? submission.jobTitle,
        candidateId: submission.candidateId,
        candidateName:
          asString(record.fields[CANDIDATES_TABLE_FIELDS.fullName]) ??
          submission.candidateName,
        accountManagerId: null,
        accountManagerName: null,
        recruitmentStatus: submission.status,
        amount: marker?.amount ?? estimated,
        currency: "INR",
        eligibleDate:
          submission.status === "joined" ? submission.submissionDate : null,
        paidDate: marker?.paidDate ?? null,
        payoutStatus:
          markerStatus ?? payoutStatusFromSubmission(submission.status),
        notes:
          meta?.payoutPct != null
            ? `Derived from Jobs.Payout (${(meta.payoutPct * 100).toFixed(1)}%)${marker ? "; status from Partners.Communications marker" : ""}.`
            : marker
              ? "Status from Partners.Communications marker."
              : "Derived estimate — Jobs.Payout % not set.",
        lastUpdated: marker?.paidDate ?? submission.submissionDate,
      });
    } catch {
      // skip incomplete candidate rows
    }
  }

  return payouts;
}

export function isDerivedPayoutId(id: string): boolean {
  return id.startsWith("derived_payout_");
}

export function submissionIdFromDerivedPayoutId(id: string): string | null {
  if (!isDerivedPayoutId(id)) {
    return null;
  }
  return id.replace(/^derived_payout_/, "");
}

export async function persistDerivedPayoutStatus(input: {
  submissionId: string;
  partnerId: string;
  status: PayoutStatus;
  amount?: number | null;
}): Promise<void> {
  const partnersTable = getAirtableTableName("partnersTable");
  const partner = await findRecord(partnersTable, input.partnerId);
  const existing = asString(partner.fields.Communications);
  const next = upsertPayoutMarker(existing, {
    submissionId: input.submissionId,
    status: input.status,
    amount: input.amount ?? null,
    paidDate:
      input.status === "paid" || input.status === "completed"
        ? new Date().toISOString()
        : null,
  });
  await updateRecord(partnersTable, input.partnerId, {
    Communications: next,
  });
}
