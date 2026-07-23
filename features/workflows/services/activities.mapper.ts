import type { AirtableFields } from "@/lib/airtable/client";
import {
  ACTIVITIES_TABLE_FIELDS,
  DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE,
  DOMAIN_PAYOUT_STATUS_TO_AIRTABLE,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import type {
  Activity,
  CreateActivityInput,
} from "@/features/workflows/types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function statusToLabel(status: string): string {
  if (status in DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE) {
    return DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[
      status as keyof typeof DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE
    ];
  }
  if (status in DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE) {
    return DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE[
      status as keyof typeof DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE
    ];
  }
  if (status in DOMAIN_PAYOUT_STATUS_TO_AIRTABLE) {
    return DOMAIN_PAYOUT_STATUS_TO_AIRTABLE[
      status as keyof typeof DOMAIN_PAYOUT_STATUS_TO_AIRTABLE
    ];
  }
  return status;
}

function mapStatusLabel(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }

  const submission = Object.entries(DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE).find(
    ([, label]) => label === raw,
  );
  if (submission) {
    return submission[0];
  }

  const document = Object.entries(
    DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE,
  ).find(([, label]) => label === raw);
  if (document) {
    return document[0];
  }

  const payout = Object.entries(DOMAIN_PAYOUT_STATUS_TO_AIRTABLE).find(
    ([, label]) => label === raw,
  );
  if (payout) {
    return payout[0];
  }

  return raw;
}

export function mapActivityRecord(record: {
  id: string;
  fields: AirtableFields;
}): Activity {
  const fields = record.fields;
  return {
    id: record.id,
    entityType:
      (asString(fields[ACTIVITIES_TABLE_FIELDS.entityType]) as
        | Activity["entityType"]
        | null) ?? "submission",
    entityId:
      asString(fields[ACTIVITIES_TABLE_FIELDS.entityId]) ??
      asLinkedId(fields[ACTIVITIES_TABLE_FIELDS.entityId]) ??
      "",
    action:
      (asString(fields[ACTIVITIES_TABLE_FIELDS.action]) as
        | Activity["action"]
        | null) ?? "status_change",
    fromStatus: mapStatusLabel(fields[ACTIVITIES_TABLE_FIELDS.fromStatus]),
    toStatus: mapStatusLabel(fields[ACTIVITIES_TABLE_FIELDS.toStatus]),
    actorUserId: asLinkedId(fields[ACTIVITIES_TABLE_FIELDS.actor]),
    note: asString(fields[ACTIVITIES_TABLE_FIELDS.note]),
    createdAt: asString(fields[ACTIVITIES_TABLE_FIELDS.createdAt]),
  };
}

export function toAirtableActivityFields(
  input: CreateActivityInput,
): AirtableFields {
  const fields: AirtableFields = {
    [ACTIVITIES_TABLE_FIELDS.entityType]: input.entityType,
    [ACTIVITIES_TABLE_FIELDS.entityId]: input.entityId,
    [ACTIVITIES_TABLE_FIELDS.action]: input.action,
    [ACTIVITIES_TABLE_FIELDS.createdAt]: new Date().toISOString(),
  };

  if (input.fromStatus) {
    fields[ACTIVITIES_TABLE_FIELDS.fromStatus] = statusToLabel(
      input.fromStatus,
    );
  }
  if (input.toStatus) {
    fields[ACTIVITIES_TABLE_FIELDS.toStatus] = statusToLabel(input.toStatus);
  }
  if (input.actorUserId) {
    fields[ACTIVITIES_TABLE_FIELDS.actor] = [input.actorUserId];
  }
  if (input.note) {
    fields[ACTIVITIES_TABLE_FIELDS.note] = input.note;
  }

  return fields;
}
