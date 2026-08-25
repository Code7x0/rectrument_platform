import { randomUUID } from "crypto";

import {
  createRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  AIRTABLE_PARTNER_QUERY_STATUS,
  AIRTABLE_PARTNER_QUERY_TYPE,
  DOMAIN_PARTNER_QUERY_STATUS_TO_AIRTABLE,
  DOMAIN_PARTNER_QUERY_TYPE_TO_AIRTABLE,
  PARTNER_QUERIES_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import type {
  PartnerQuery,
  PartnerQueryStatus,
  PartnerQueryType,
} from "@/features/feedback/types";

function getTableName(): string {
  return (
    getOptionalAirtableTableName("partnerQueriesTable") ?? "Partner Queries"
  );
}

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function newPartnerQueryId(): string {
  return `pq_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function mapType(value: unknown): PartnerQueryType {
  const raw = asString(value) ?? "";
  const mapped =
    AIRTABLE_PARTNER_QUERY_TYPE[
      raw as keyof typeof AIRTABLE_PARTNER_QUERY_TYPE
    ] ?? null;
  if (
    mapped === "account_question" ||
    mapped === "feedback" ||
    mapped === "suggestion"
  ) {
    return mapped;
  }
  return "feedback";
}

function mapStatus(value: unknown): PartnerQueryStatus {
  const raw = asString(value) ?? "";
  const mapped =
    AIRTABLE_PARTNER_QUERY_STATUS[
      raw as keyof typeof AIRTABLE_PARTNER_QUERY_STATUS
    ] ?? null;
  if (mapped === "open" || mapped === "answered" || mapped === "closed") {
    return mapped;
  }
  return "open";
}

function mapQueryRecord(
  recordId: string,
  fields: AirtableFields,
): PartnerQuery | null {
  const id = asString(fields[PARTNER_QUERIES_TABLE_FIELDS.queryId]);
  const partnerId = asString(fields[PARTNER_QUERIES_TABLE_FIELDS.partner]);
  const message = asString(fields[PARTNER_QUERIES_TABLE_FIELDS.message]);
  if (!id || !partnerId || !message) {
    return null;
  }
  return {
    id,
    recordId,
    partnerId,
    partnerCode:
      asString(fields[PARTNER_QUERIES_TABLE_FIELDS.partnerCode]) ?? partnerId,
    accountManagerId:
      asString(fields[PARTNER_QUERIES_TABLE_FIELDS.accountManager]) || null,
    type: mapType(fields[PARTNER_QUERIES_TABLE_FIELDS.queryType]),
    message,
    status: mapStatus(fields[PARTNER_QUERIES_TABLE_FIELDS.status]),
    amComments: asString(fields[PARTNER_QUERIES_TABLE_FIELDS.amComments]),
    submittedAt:
      asString(fields[PARTNER_QUERIES_TABLE_FIELDS.submittedAt]) ??
      new Date(0).toISOString(),
    answeredAt: asString(fields[PARTNER_QUERIES_TABLE_FIELDS.answeredAt]),
    answeredByUserId: asString(
      fields[PARTNER_QUERIES_TABLE_FIELDS.answeredBy],
    ),
  };
}

function toCreateFields(query: PartnerQuery): AirtableFields {
  const fields: AirtableFields = {
    [PARTNER_QUERIES_TABLE_FIELDS.queryId]: query.id,
    [PARTNER_QUERIES_TABLE_FIELDS.partner]: query.partnerId,
    [PARTNER_QUERIES_TABLE_FIELDS.partnerCode]: query.partnerCode,
    [PARTNER_QUERIES_TABLE_FIELDS.queryType]:
      DOMAIN_PARTNER_QUERY_TYPE_TO_AIRTABLE[query.type],
    [PARTNER_QUERIES_TABLE_FIELDS.message]: query.message,
    [PARTNER_QUERIES_TABLE_FIELDS.status]:
      DOMAIN_PARTNER_QUERY_STATUS_TO_AIRTABLE[query.status],
    [PARTNER_QUERIES_TABLE_FIELDS.submittedAt]: query.submittedAt,
  };
  if (query.accountManagerId) {
    fields[PARTNER_QUERIES_TABLE_FIELDS.accountManager] =
      query.accountManagerId;
  }
  return fields;
}

export async function listAllPartnerQueries(): Promise<PartnerQuery[]> {
  const records = await getRecords(getTableName(), {
    sort: [
      {
        field: PARTNER_QUERIES_TABLE_FIELDS.submittedAt,
        direction: "desc",
      },
    ],
  });
  const queries: PartnerQuery[] = [];
  for (const record of records) {
    const mapped = mapQueryRecord(
      record.id,
      record.fields as AirtableFields,
    );
    if (mapped) {
      queries.push(mapped);
    }
  }
  return queries;
}

export async function listPartnerQueriesForPartner(
  partnerId: string,
): Promise<PartnerQuery[]> {
  const records = await getRecords(getTableName(), {
    filterByFormula: `{${PARTNER_QUERIES_TABLE_FIELDS.partner}} = '${escapeFormulaValue(partnerId)}'`,
    sort: [
      {
        field: PARTNER_QUERIES_TABLE_FIELDS.submittedAt,
        direction: "desc",
      },
    ],
  });
  const queries: PartnerQuery[] = [];
  for (const record of records) {
    const mapped = mapQueryRecord(
      record.id,
      record.fields as AirtableFields,
    );
    if (mapped) {
      queries.push(mapped);
    }
  }
  return queries;
}

export async function findPartnerQueryById(
  queryId: string,
): Promise<PartnerQuery | null> {
  const records = await getRecords(getTableName(), {
    filterByFormula: `{${PARTNER_QUERIES_TABLE_FIELDS.queryId}} = '${escapeFormulaValue(queryId)}'`,
    maxRecords: 1,
  });
  const record = records[0];
  if (!record) {
    return null;
  }
  return mapQueryRecord(record.id, record.fields as AirtableFields);
}

export async function insertPartnerQuery(input: {
  partnerId: string;
  partnerCode: string;
  accountManagerId: string | null;
  type: PartnerQueryType;
  message: string;
}): Promise<PartnerQuery> {
  const query: PartnerQuery = {
    id: newPartnerQueryId(),
    recordId: null,
    partnerId: input.partnerId,
    partnerCode: input.partnerCode,
    accountManagerId: input.accountManagerId,
    type: input.type,
    message: input.message.trim(),
    status: "open",
    amComments: null,
    submittedAt: new Date().toISOString(),
    answeredAt: null,
    answeredByUserId: null,
  };

  const created = await createRecord(getTableName(), toCreateFields(query));
  return {
    ...query,
    recordId: created.id,
  };
}

export async function replyToPartnerQuery(
  queryId: string,
  patch: {
    amComments: string;
    answeredByUserId: string;
    accountManagerId?: string | null;
    status?: PartnerQueryStatus;
  },
): Promise<PartnerQuery> {
  const current = await findPartnerQueryById(queryId);
  if (!current) {
    throw new Error("Query not found");
  }
  if (!current.recordId) {
    throw new Error("Query record id missing");
  }

  const comments = patch.amComments.trim();
  if (!comments) {
    throw new Error("Comments are required");
  }

  const now = new Date().toISOString();
  const next: PartnerQuery = {
    ...current,
    amComments: comments,
    status: patch.status ?? "answered",
    answeredAt: now,
    answeredByUserId: patch.answeredByUserId,
    accountManagerId:
      patch.accountManagerId ?? current.accountManagerId,
  };

  const fields: AirtableFields = {
    [PARTNER_QUERIES_TABLE_FIELDS.amComments]: comments,
    [PARTNER_QUERIES_TABLE_FIELDS.status]:
      DOMAIN_PARTNER_QUERY_STATUS_TO_AIRTABLE[next.status],
    [PARTNER_QUERIES_TABLE_FIELDS.answeredAt]: now,
    [PARTNER_QUERIES_TABLE_FIELDS.answeredBy]: patch.answeredByUserId,
  };
  if (next.accountManagerId) {
    fields[PARTNER_QUERIES_TABLE_FIELDS.accountManager] =
      next.accountManagerId;
  }

  await updateRecord(getTableName(), current.recordId, fields);
  return next;
}
