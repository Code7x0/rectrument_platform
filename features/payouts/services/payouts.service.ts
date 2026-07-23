import { getRecords, type AirtableFields } from "@/lib/airtable/client";
import { PARTNERS_TABLE_FIELDS, PAYOUTS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import {
  listAccountManagerOptions,
} from "@/services/lookups";
import { getCandidateById } from "@/features/candidates/services";
import { getJobById } from "@/features/jobs/services";
import {
  findPayoutById,
  findPayouts,
  insertPayout,
  patchPayout,
} from "@/features/payouts/repositories/payouts.repository";
import {
  buildPayoutBySubmissionFormula,
  buildPayoutsFilterFormula,
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "@/features/payouts/services/payouts.mapper";
import {
  isValidPayoutTransition,
  requiresAmount,
} from "@/features/payouts/schemas/payout.schema";
import type {
  CreatePayoutInput,
  PartnerEarningsSummary,
  Payout,
  PayoutListFilters,
  PayoutStatus,
  UpdatePayoutInput,
} from "@/features/payouts/types";
import { getSubmissionById } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import { recordActivity } from "@/features/workflows/services/activity.service";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadPartnerMeta(
  partnerIds: string[],
): Promise<
  Map<
    string,
    {
      partnerCode: string;
      identityLabel: string | null;
      identityVisibility: "public" | "private";
    }
  >
> {
  const unique = [...new Set(partnerIds)];
  const map = new Map<
    string,
    {
      partnerCode: string;
      identityLabel: string | null;
      identityVisibility: "public" | "private";
    }
  >();
  if (unique.length === 0) {
    return map;
  }

  const records = await getRecords(getAirtableTableName("partnersTable"), {
    filterByFormula: `OR(${unique.map((id) => `RECORD_ID() = '${id}'`).join(",")})`,
  });

  for (const record of records) {
    const fields = record.fields as AirtableFields;
    const partnerCode =
      asString(fields[PARTNERS_TABLE_FIELDS.partnerId]) ??
      record.id.replace(/^rec/, "TP-");
    const company = asString(fields[PARTNERS_TABLE_FIELDS.companyName]);
    const contact = asString(fields[PARTNERS_TABLE_FIELDS.name]);
    const visibilityRaw = asString(
      fields[PARTNERS_TABLE_FIELDS.identityVisibility],
    );
    map.set(record.id, {
      partnerCode,
      identityLabel:
        company && contact
          ? `${company} — ${contact}`
          : (company ?? contact ?? null),
      identityVisibility: visibilityRaw === "PUBLIC" ? "public" : "private",
    });
  }

  return map;
}

async function withEnrichment(
  payouts: Payout[],
  includePartnerIdentity: boolean,
): Promise<Payout[]> {
  if (payouts.length === 0) {
    return payouts;
  }

  const [partnerMeta, accountManagers] = await Promise.all([
    loadPartnerMeta(payouts.map((p) => p.partnerId)),
    listAccountManagerOptions(),
  ]);
  const amMap = new Map(accountManagers.map((am) => [am.id, am.label]));

  const submissionIds = [...new Set(payouts.map((p) => p.submissionId))];
  const submissions = await Promise.all(
    submissionIds.map((id) => getSubmissionById(id)),
  );
  const submissionMap = new Map(
    submissions
      .filter((s): s is Submission => Boolean(s))
      .map((s) => [s.id, s]),
  );

  const jobIds = [...new Set(payouts.map((p) => p.jobId))];
  const jobs = await Promise.all(jobIds.map((id) => getJobById(id)));
  const jobMap = new Map(
    jobs.filter((j): j is NonNullable<typeof j> => Boolean(j)).map((j) => [j.id, j]),
  );

  const candidateIds = [...new Set(payouts.map((p) => p.candidateId))];
  const candidates = await Promise.all(
    candidateIds.map((id) => getCandidateById(id)),
  );
  const candidateMap = new Map(
    candidates
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => [c.id, c]),
  );

  return payouts.map((payout) => {
    const submission = submissionMap.get(payout.submissionId);
    const job = jobMap.get(payout.jobId);
    const candidate = candidateMap.get(payout.candidateId);
    const meta = partnerMeta.get(payout.partnerId);
    const showIdentity =
      includePartnerIdentity || meta?.identityVisibility === "public";

    return {
      ...payout,
      partnerCode: meta?.partnerCode ?? payout.partnerId.replace(/^rec/, "TP-"),
      partnerName: showIdentity ? (meta?.identityLabel ?? null) : null,
      jobTitle: job?.title ?? submission?.jobTitle ?? null,
      candidateName: candidate?.fullName ?? submission?.candidateName ?? null,
      accountManagerId: job?.accountManagerId ?? null,
      accountManagerName: job?.accountManagerId
        ? (amMap.get(job.accountManagerId) ?? null)
        : null,
      recruitmentStatus: submission?.status ?? null,
    };
  });
}

function applySearchFilter(payouts: Payout[], search?: string): Payout[] {
  if (!search?.trim()) {
    return payouts;
  }
  const q = search.trim().toLowerCase();
  return payouts.filter(
    (row) =>
      (row.payoutCode?.toLowerCase().includes(q) ?? false) ||
      (row.partnerCode?.toLowerCase().includes(q) ?? false) ||
      (row.partnerName?.toLowerCase().includes(q) ?? false) ||
      (row.candidateName?.toLowerCase().includes(q) ?? false) ||
      (row.jobTitle?.toLowerCase().includes(q) ?? false),
  );
}

export async function listPayouts(
  filters: PayoutListFilters = {},
): Promise<Payout[]> {
  const {
    search,
    includePartnerIdentity = false,
    accountManagerId,
    payoutStatus,
    ...airtableFilters
  } = filters;

  const formula = buildPayoutsFilterFormula({
    partnerId: airtableFilters.partnerId,
    payoutStatus: payoutStatus && payoutStatus !== "all" ? payoutStatus : undefined,
  });

  const rows = await findPayouts({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: PAYOUTS_TABLE_FIELDS.lastUpdated, direction: "desc" }],
  });

  let enriched = await withEnrichment(rows, includePartnerIdentity);

  if (accountManagerId && accountManagerId !== "all") {
    enriched = enriched.filter(
      (row) => row.accountManagerId === accountManagerId,
    );
  }

  return applySearchFilter(enriched, search);
}

export async function listPayoutsForPartner(partnerId: string): Promise<Payout[]> {
  return listPayouts({
    partnerId,
    includePartnerIdentity: false,
  });
}

export async function getPayoutById(
  payoutId: string,
  options: { includePartnerIdentity?: boolean } = {},
): Promise<Payout | null> {
  const row = await findPayoutById(payoutId);
  if (!row) {
    return null;
  }
  const enrichedList = await withEnrichment(
    [row],
    options.includePartnerIdentity ?? false,
  );
  return enrichedList[0] ?? null;
}

export async function getPayoutBySubmissionId(
  submissionId: string,
): Promise<Payout | null> {
  const rows = await findPayouts({
    filterByFormula: buildPayoutBySubmissionFormula(submissionId),
    maxRecords: 1,
  });
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  if (!row) {
    return null;
  }
  const enrichedList = await withEnrichment([row], false);
  return enrichedList[0] ?? null;
}

/**
 * One payout per submission — idempotent create on candidate submit.
 * Returns null when payouts storage is not configured on the client base.
 */
export async function ensurePayoutForSubmission(
  submission: Submission,
): Promise<Payout | null> {
  try {
    const existing = await getPayoutBySubmissionId(submission.id);
    if (existing) {
      return existing;
    }

    const created = await insertPayout(
      toAirtableCreateFields({
        submissionId: submission.id,
        partnerId: submission.partnerId,
        jobId: submission.jobId,
        candidateId: submission.candidateId,
        payoutStatus: "not_eligible",
      }),
    );
    if (!created) {
      return null;
    }

    const enrichedList = await withEnrichment([created], false);
    return enrichedList[0] ?? created;
  } catch (error) {
    console.error("ensurePayoutForSubmission skipped", error);
    return null;
  }
}

export async function createPayout(input: CreatePayoutInput): Promise<Payout> {
  const existing = await getPayoutBySubmissionId(input.submissionId);
  if (existing) {
    throw new Error("A payout already exists for this submission");
  }

  const created = await insertPayout(toAirtableCreateFields(input));
  if (!created) {
    throw new Error(
      "Payouts storage is not configured on this Airtable base. Contact an administrator.",
    );
  }
  const enrichedList = await withEnrichment([created], false);
  return enrichedList[0] ?? created;
}

export class InvalidPayoutTransitionError extends Error {
  constructor(from: PayoutStatus, to: PayoutStatus) {
    super(`Invalid payout transition: ${from} → ${to}`);
    this.name = "InvalidPayoutTransitionError";
  }
}

async function validatePayoutBusinessRules(
  payout: Payout,
  toStatus: PayoutStatus,
  amount: number | null | undefined,
): Promise<void> {
  const submission = await getSubmissionById(payout.submissionId);
  if (!submission) {
    throw new Error("Linked submission not found");
  }

  if (submission.status === "rejected" && toStatus !== "not_eligible") {
    throw new Error("Rejected submissions cannot become payout eligible");
  }

  if (requiresAmount(toStatus)) {
    const effectiveAmount = amount ?? payout.amount;
    if (effectiveAmount == null || effectiveAmount <= 0) {
      throw new Error("Amount is required before this payout status");
    }
  }
}

export async function updatePayoutStatus(input: {
  payoutId: string;
  toStatus: PayoutStatus;
  actorUserId: string;
  role: "admin" | "account_manager";
  amount?: number;
  currency?: string;
  eligibleDate?: string;
  paidDate?: string;
  notes?: string;
}): Promise<Payout> {
  const current = await getPayoutById(input.payoutId);
  if (!current) {
    throw new Error("Payout not found");
  }

  if (!isValidPayoutTransition(current.payoutStatus, input.toStatus, input.role)) {
    throw new InvalidPayoutTransitionError(current.payoutStatus, input.toStatus);
  }

  await validatePayoutBusinessRules(
    current,
    input.toStatus,
    input.amount ?? current.amount,
  );

  const fromStatus = current.payoutStatus;
  const patch: UpdatePayoutInput = {
    payoutStatus: input.toStatus,
    notes: input.notes ?? current.notes,
  };

  if (input.amount !== undefined) {
    patch.amount = input.amount;
  }
  if (input.currency) {
    patch.currency = input.currency;
  }
  if (input.toStatus === "eligible" || input.toStatus === "processing") {
    patch.eligibleDate =
      input.eligibleDate ?? new Date().toISOString().slice(0, 10);
  }
  if (input.toStatus === "paid" || input.toStatus === "completed") {
    patch.paidDate = input.paidDate ?? new Date().toISOString().slice(0, 10);
  }

  const updated = await patchPayout(
    input.payoutId,
    toAirtableUpdateFields(patch),
  );

  try {
    await recordActivity({
      entityType: "payout",
      entityId: input.payoutId,
      action: "payout_status_change",
      fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      note: input.notes ?? null,
    });
  } catch (error) {
    console.error("Failed to record payout activity", error);
  }

  const [enriched] = await withEnrichment([updated], false);
  const row = enriched ?? updated;

  try {
    const { notifyPayoutStatusChanged } = await import(
      "@/features/notifications/services/notification-events"
    );
    const { formatCurrency } = await import("@/lib/utils");
    await notifyPayoutStatusChanged({
      partnerId: row.partnerId,
      payoutId: row.id,
      candidateName: row.candidateName ?? "Candidate",
      toStatus: input.toStatus,
      amountLabel:
        row.amount != null
          ? formatCurrency(row.amount, row.currency)
          : undefined,
    });
  } catch (error) {
    console.error("Failed to publish payout notification", error);
  }

  return row;
}

export async function updatePayoutNotes(
  payoutId: string,
  notes: string,
): Promise<Payout> {
  const updated = await patchPayout(
    payoutId,
    toAirtableUpdateFields({ notes }),
  );
  const [enriched] = await withEnrichment([updated], false);
  return enriched ?? updated;
}

function payoutAmountValue(payout: Payout): number {
  return payout.amount ?? 0;
}

export function summarizePartnerEarnings(
  payouts: Payout[],
): PartnerEarningsSummary {
  const currency = payouts[0]?.currency ?? "INR";
  let pendingEarnings = 0;
  let paidEarnings = 0;

  for (const payout of payouts) {
    const amount = payoutAmountValue(payout);
    if (payout.payoutStatus === "eligible" || payout.payoutStatus === "processing") {
      pendingEarnings += amount;
    }
    if (payout.payoutStatus === "paid" || payout.payoutStatus === "completed") {
      paidEarnings += amount;
    }
  }

  return {
    totalEarnings: paidEarnings,
    pendingEarnings,
    paidEarnings,
    currency,
  };
}

export async function getPartnerEarningsSummary(
  partnerId: string,
): Promise<PartnerEarningsSummary> {
  const payouts = await listPayoutsForPartner(partnerId);
  return summarizePartnerEarnings(payouts);
}

/** Map submission id → payout for partner transparency views. */
export async function getPayoutMapForPartner(
  partnerId: string,
): Promise<Map<string, Payout>> {
  const payouts = await listPayoutsForPartner(partnerId);
  return new Map(payouts.map((p) => [p.submissionId, p]));
}
