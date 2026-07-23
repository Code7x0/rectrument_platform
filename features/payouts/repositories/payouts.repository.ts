import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { AirtableStorageUnavailableError } from "@/lib/airtable/errors";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import { mapPayoutRecord } from "@/features/payouts/services/payouts.mapper";
import {
  derivePayoutsFromClientCrm,
  isDerivedPayoutId,
  persistDerivedPayoutStatus,
  submissionIdFromDerivedPayoutId,
} from "@/features/payouts/services/payouts.derived";
import type { Payout, PayoutStatus } from "@/features/payouts/types";
import { DOMAIN_PAYOUT_STATUS_TO_AIRTABLE } from "@/lib/airtable/fields";

function getTableName(): string | null {
  return getOptionalAirtableTableName("payoutsTable");
}

export function isPayoutsStorageAvailable(): boolean {
  // Derived mode still supports read + status markers via Partners.Communications.
  return true;
}


export async function findPayouts(
  options: AirtableListOptions = {},
): Promise<Payout[]> {
  const table = getTableName();
  if (!table) {
    try {
      const derived = await derivePayoutsFromClientCrm();
      // Soft-apply partner/job filters from formula FIND patterns when present.
      const formula = options.filterByFormula ?? "";
      let rows = derived;
      const partnerMatch =
        /FIND\('(rec[A-Za-z0-9]+)', ARRAYJOIN\(\{Partner\}\)\)/.exec(formula);
      if (partnerMatch?.[1]) {
        rows = rows.filter((row) => row.partnerId === partnerMatch[1]);
      }
      return rows;
    } catch (error) {
      console.error("Failed to derive payouts", error);
      return [];
    }
  }
  try {
    const records = await getRecords(table, options);
    return records.map((record) =>
      mapPayoutRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      }),
    );
  } catch (error) {
    console.error("Failed to list payouts", error);
    return [];
  }
}

export async function findPayoutById(recordId: string): Promise<Payout | null> {
  if (isDerivedPayoutId(recordId)) {
    const all = await findPayouts();
    return all.find((row) => row.id === recordId) ?? null;
  }
  const table = getTableName();
  if (!table) {
    return null;
  }
  try {
    const record = await findRecord(table, recordId);
    return mapPayoutRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertPayout(
  fields: AirtableFields,
): Promise<Payout | null> {
  const table = getTableName();
  if (!table) {
    // Derived mode — ledger writes not supported; submit path soft-skips.
    return null;
  }
  const record = await createRecord(table, fields);
  return mapPayoutRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchPayout(
  recordId: string,
  fields: AirtableFields,
): Promise<Payout> {
  if (isDerivedPayoutId(recordId)) {
    const submissionId = submissionIdFromDerivedPayoutId(recordId);
    const current = await findPayoutById(recordId);
    if (!submissionId || !current) {
      throw new AirtableStorageUnavailableError(
        "payoutsTable",
        "Derived payout not found.",
      );
    }
    const statusRaw = fields["Payout Status"];
    const status =
      typeof statusRaw === "string"
        ? (Object.entries(DOMAIN_PAYOUT_STATUS_TO_AIRTABLE).find(
            ([, label]) => label === statusRaw,
          )?.[0] as PayoutStatus | undefined)
        : undefined;
    const amount =
      typeof fields.Amount === "number" ? fields.Amount : current.amount;
    const notes =
      typeof fields.Notes === "string" ? fields.Notes : current.notes;

    if (status) {
      await persistDerivedPayoutStatus({
        submissionId,
        partnerId: current.partnerId,
        status,
        amount,
      });
    }

    return {
      ...current,
      payoutStatus: status ?? current.payoutStatus,
      amount: amount ?? null,
      notes,
      paidDate:
        status === "paid" || status === "completed"
          ? new Date().toISOString()
          : current.paidDate,
      lastUpdated: new Date().toISOString(),
    };
  }
  const table = getTableName();
  if (!table) {
    throw new AirtableStorageUnavailableError("payoutsTable");
  }
  const record = await updateRecord(table, recordId, fields);
  return mapPayoutRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
