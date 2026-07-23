import type { AirtableFields } from "@/lib/airtable/client";
import {
  AIRTABLE_PAYOUT_STATUS,
  DOMAIN_PAYOUT_STATUS_TO_AIRTABLE,
  PAYOUTS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  CreatePayoutInput,
  Payout,
  PayoutStatus,
  UpdatePayoutInput,
} from "@/features/payouts/types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapPayoutStatus(value: unknown): PayoutStatus {
  const raw = asString(value);
  if (!raw) {
    return "not_eligible";
  }
  return (
    AIRTABLE_PAYOUT_STATUS[raw as keyof typeof AIRTABLE_PAYOUT_STATUS] ??
    "not_eligible"
  );
}

export function mapPayoutRecord(record: {
  id: string;
  fields: AirtableFields;
}): Payout {
  const fields = record.fields;
  const submissionId = asLinkedId(fields[PAYOUTS_TABLE_FIELDS.submission]);
  const partnerId = asLinkedId(fields[PAYOUTS_TABLE_FIELDS.partner]);
  const jobId = asLinkedId(fields[PAYOUTS_TABLE_FIELDS.job]);
  const candidateId = asLinkedId(fields[PAYOUTS_TABLE_FIELDS.candidate]);

  if (!submissionId || !partnerId || !jobId || !candidateId) {
    throw new Error(`Payout ${record.id} is missing required links`);
  }

  return {
    id: record.id,
    payoutCode:
      asString(fields[PAYOUTS_TABLE_FIELDS.payoutId]) ??
      record.id.replace(/^rec/, "PAY-"),
    submissionId,
    partnerId,
    partnerCode: null,
    partnerName: null,
    jobId,
    jobTitle: null,
    candidateId,
    candidateName: null,
    accountManagerId: null,
    accountManagerName: null,
    recruitmentStatus: null,
    amount: asNumber(fields[PAYOUTS_TABLE_FIELDS.amount]),
    currency: asString(fields[PAYOUTS_TABLE_FIELDS.currency]) ?? "INR",
    eligibleDate: asString(fields[PAYOUTS_TABLE_FIELDS.eligibleDate]),
    paidDate: asString(fields[PAYOUTS_TABLE_FIELDS.paidDate]),
    payoutStatus: mapPayoutStatus(fields[PAYOUTS_TABLE_FIELDS.payoutStatus]),
    notes: asString(fields[PAYOUTS_TABLE_FIELDS.notes]),
    lastUpdated: asString(fields[PAYOUTS_TABLE_FIELDS.lastUpdated]),
  };
}

export function toAirtableCreateFields(input: CreatePayoutInput): AirtableFields {
  const fields: AirtableFields = {
    [PAYOUTS_TABLE_FIELDS.submission]: [input.submissionId],
    [PAYOUTS_TABLE_FIELDS.partner]: [input.partnerId],
    [PAYOUTS_TABLE_FIELDS.job]: [input.jobId],
    [PAYOUTS_TABLE_FIELDS.candidate]: [input.candidateId],
    [PAYOUTS_TABLE_FIELDS.currency]: input.currency ?? "INR",
    [PAYOUTS_TABLE_FIELDS.payoutStatus]:
      DOMAIN_PAYOUT_STATUS_TO_AIRTABLE[input.payoutStatus ?? "not_eligible"],
    [PAYOUTS_TABLE_FIELDS.lastUpdated]: new Date().toISOString(),
  };

  if (input.amount != null && input.amount > 0) {
    fields[PAYOUTS_TABLE_FIELDS.amount] = input.amount;
  }
  if (input.notes) {
    fields[PAYOUTS_TABLE_FIELDS.notes] = input.notes;
  }

  return fields;
}

export function toAirtableUpdateFields(input: UpdatePayoutInput): AirtableFields {
  const fields: AirtableFields = {
    [PAYOUTS_TABLE_FIELDS.lastUpdated]:
      input.lastUpdated ?? new Date().toISOString(),
  };

  if (input.amount !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.amount] = input.amount ?? 0;
  }
  if (input.currency !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.currency] = input.currency;
  }
  if (input.payoutStatus !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.payoutStatus] =
      DOMAIN_PAYOUT_STATUS_TO_AIRTABLE[input.payoutStatus];
  }
  if (input.eligibleDate !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.eligibleDate] = input.eligibleDate ?? "";
  }
  if (input.paidDate !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.paidDate] = input.paidDate ?? "";
  }
  if (input.notes !== undefined) {
    fields[PAYOUTS_TABLE_FIELDS.notes] = input.notes ?? "";
  }

  return fields;
}

export function buildPayoutsFilterFormula(filters: {
  partnerId?: string;
  payoutStatus?: PayoutStatus;
}): string | undefined {
  const clauses: string[] = [];

  if (filters.partnerId) {
    clauses.push(
      `FIND('${filters.partnerId.replace(/'/g, "\\'")}', ARRAYJOIN({${PAYOUTS_TABLE_FIELDS.partner}}))`,
    );
  }
  if (filters.payoutStatus) {
    clauses.push(
      `{${PAYOUTS_TABLE_FIELDS.payoutStatus}} = '${DOMAIN_PAYOUT_STATUS_TO_AIRTABLE[filters.payoutStatus]}'`,
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return `AND(${clauses.join(", ")})`;
}

export function buildPayoutBySubmissionFormula(submissionId: string): string {
  return `FIND('${submissionId.replace(/'/g, "\\'")}', ARRAYJOIN({${PAYOUTS_TABLE_FIELDS.submission}}))`;
}
