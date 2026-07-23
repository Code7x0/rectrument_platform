import type { AirtableFields } from "@/lib/airtable/client";
import {
  asSelectList,
  asString,
  isClientCompatMode,
  toPartnerSpecializationChoices,
} from "@/lib/airtable/compat";
import {
  AIRTABLE_IDENTITY_VISIBILITY,
  AIRTABLE_PARTNER_STATUS,
  AIRTABLE_PARTNER_VERIFICATION,
  DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE,
  DOMAIN_PARTNER_STATUS_TO_AIRTABLE,
  DOMAIN_PARTNER_VERIFICATION_TO_AIRTABLE,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import type {
  CreatePartnerInput,
  IdentityVisibility,
  Partner,
  PartnerStatus,
  PartnerVerificationStatus,
  UpdatePartnerInput,
} from "@/features/partners/types";

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

function mapStatus(value: unknown): PartnerStatus {
  const raw = asString(value);
  if (!raw) {
    return "pending";
  }
  return (
    AIRTABLE_PARTNER_STATUS[raw as keyof typeof AIRTABLE_PARTNER_STATUS] ??
    "pending"
  );
}

function mapVerification(value: unknown): PartnerVerificationStatus {
  const raw = asString(value);
  if (!raw) {
    return "pending";
  }
  return (
    AIRTABLE_PARTNER_VERIFICATION[
      raw as keyof typeof AIRTABLE_PARTNER_VERIFICATION
    ] ?? "pending"
  );
}

function mapIdentityVisibility(value: unknown): IdentityVisibility {
  const raw = asString(value);
  if (!raw) {
    return "private";
  }
  return (
    AIRTABLE_IDENTITY_VISIBILITY[
      raw as keyof typeof AIRTABLE_IDENTITY_VISIBILITY
    ] ?? "private"
  );
}

export function mapPartnerRecord(record: {
  id: string;
  fields: AirtableFields;
}): Partner {
  const fields = record.fields;
  return {
    id: record.id,
    partnerCode:
      asString(fields[PARTNERS_TABLE_FIELDS.partnerId]) ??
      record.id.replace(/^rec/, "PRT-"),
    companyName:
      asString(fields[PARTNERS_TABLE_FIELDS.companyName]) ??
      "Untitled Partner",
    contactName: asString(fields[PARTNERS_TABLE_FIELDS.name]),
    email: asString(fields[PARTNERS_TABLE_FIELDS.email]),
    phone: asString(fields[PARTNERS_TABLE_FIELDS.phone]),
    specialization: asSelectList(fields[PARTNERS_TABLE_FIELDS.specialization]),
    revenueShare: asString(fields[PARTNERS_TABLE_FIELDS.revenueShare]),
    rating: asNumber(fields[PARTNERS_TABLE_FIELDS.rating]),
    status: mapStatus(fields[PARTNERS_TABLE_FIELDS.status]),
    verificationStatus: mapVerification(
      fields[PARTNERS_TABLE_FIELDS.verificationStatus],
    ),
    identityVisibility: mapIdentityVisibility(
      fields[PARTNERS_TABLE_FIELDS.identityVisibility],
    ),
    city: asString(fields[PARTNERS_TABLE_FIELDS.city]),
    state: asString(fields[PARTNERS_TABLE_FIELDS.state]),
    skills: asString(fields[PARTNERS_TABLE_FIELDS.skills]),
    experience: asString(fields[PARTNERS_TABLE_FIELDS.experience]),
    bankDetails: asString(fields[PARTNERS_TABLE_FIELDS.bankDetails]),
    notes: asString(fields[PARTNERS_TABLE_FIELDS.notes]),
  };
}

export function toAirtableCreateFields(
  input: CreatePartnerInput,
): AirtableFields {
  const status =
    input.status === "archived" ? "pending" : (input.status ?? "pending");
  const clientMode = isClientCompatMode();

  const fields: AirtableFields = {
    [PARTNERS_TABLE_FIELDS.companyName]: input.companyName,
    [PARTNERS_TABLE_FIELDS.status]: DOMAIN_PARTNER_STATUS_TO_AIRTABLE[status],
  };

  if (!clientMode) {
    fields[PARTNERS_TABLE_FIELDS.verificationStatus] =
      DOMAIN_PARTNER_VERIFICATION_TO_AIRTABLE[
        input.verificationStatus ?? "pending"
      ];
    fields[PARTNERS_TABLE_FIELDS.identityVisibility] =
      DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE[
        input.identityVisibility ?? "private"
      ];
  }

  if (input.contactName) {
    fields[PARTNERS_TABLE_FIELDS.name] = input.contactName;
  }
  if (input.email) {
    fields[PARTNERS_TABLE_FIELDS.email] = input.email;
  }
  if (input.phone) {
    fields[PARTNERS_TABLE_FIELDS.phone] = input.phone;
  }
  if (input.specialization) {
    fields[PARTNERS_TABLE_FIELDS.specialization] = clientMode
      ? toPartnerSpecializationChoices(input.specialization)
      : input.specialization;
  }
  if (input.revenueShare) {
    fields[PARTNERS_TABLE_FIELDS.revenueShare] = input.revenueShare;
  }
  if (input.rating !== undefined && Number.isFinite(input.rating)) {
    fields[PARTNERS_TABLE_FIELDS.rating] = input.rating;
  }
  if (input.city) {
    fields[PARTNERS_TABLE_FIELDS.city] = input.city;
  }
  if (!clientMode && input.state) {
    fields[PARTNERS_TABLE_FIELDS.state] = input.state;
  }
  if (!clientMode && input.skills) {
    fields[PARTNERS_TABLE_FIELDS.skills] = input.skills;
  }
  if (!clientMode && input.experience) {
    fields[PARTNERS_TABLE_FIELDS.experience] = input.experience;
  }
  if (!clientMode && input.bankDetails) {
    fields[PARTNERS_TABLE_FIELDS.bankDetails] = input.bankDetails;
  }
  if (input.notes) {
    fields[PARTNERS_TABLE_FIELDS.notes] = input.notes;
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: UpdatePartnerInput,
): AirtableFields {
  const fields: AirtableFields = {};
  const clientMode = isClientCompatMode();

  if (input.companyName !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.companyName] = input.companyName;
  }
  if (input.contactName !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.name] = input.contactName || "";
  }
  if (input.email !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.email] = input.email || "";
  }
  if (input.phone !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.phone] = input.phone || "";
  }
  if (input.specialization !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.specialization] = input.specialization
      ? clientMode
        ? toPartnerSpecializationChoices(input.specialization)
        : input.specialization
      : [];
  }
  if (input.revenueShare !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.revenueShare] = input.revenueShare || "";
  }
  if (input.rating !== undefined) {
    if (Number.isFinite(input.rating)) {
      fields[PARTNERS_TABLE_FIELDS.rating] = input.rating;
    }
  }
  if (input.status !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.status] =
      DOMAIN_PARTNER_STATUS_TO_AIRTABLE[input.status];
  }
  if (!clientMode && input.verificationStatus !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.verificationStatus] =
      DOMAIN_PARTNER_VERIFICATION_TO_AIRTABLE[input.verificationStatus];
  }
  if (input.notes !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.notes] = input.notes || "";
  }
  if (!clientMode && input.identityVisibility !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.identityVisibility] =
      DOMAIN_IDENTITY_VISIBILITY_TO_AIRTABLE[input.identityVisibility];
  }
  if (input.city !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.city] = input.city || "";
  }
  if (!clientMode && input.state !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.state] = input.state || "";
  }
  if (!clientMode && input.skills !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.skills] = input.skills || "";
  }
  if (!clientMode && input.experience !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.experience] = input.experience || "";
  }
  if (!clientMode && input.bankDetails !== undefined) {
    fields[PARTNERS_TABLE_FIELDS.bankDetails] = input.bankDetails || "";
  }

  return fields;
}

export function buildPartnersFilterFormula(filters: {
  status?: PartnerStatus | "all";
  verificationStatus?: PartnerVerificationStatus | "all";
  includeArchived?: boolean;
}): string {
  const clauses: string[] = [];
  const clientMode = isClientCompatMode();

  if (
    !filters.includeArchived &&
    (!filters.status || filters.status === "all")
  ) {
    if (!clientMode) {
      clauses.push(
        `NOT({${PARTNERS_TABLE_FIELDS.status}} = '${DOMAIN_PARTNER_STATUS_TO_AIRTABLE.archived}')`,
      );
    }
  }

  if (filters.status && filters.status !== "all") {
    clauses.push(
      `{${PARTNERS_TABLE_FIELDS.status}} = '${DOMAIN_PARTNER_STATUS_TO_AIRTABLE[filters.status]}'`,
    );
  }

  if (
    !clientMode &&
    filters.verificationStatus &&
    filters.verificationStatus !== "all"
  ) {
    clauses.push(
      `{${PARTNERS_TABLE_FIELDS.verificationStatus}} = '${DOMAIN_PARTNER_VERIFICATION_TO_AIRTABLE[filters.verificationStatus]}'`,
    );
  }

  if (clauses.length === 0) {
    return "";
  }
  if (clauses.length === 1) {
    return clauses[0] ?? "";
  }
  return `AND(${clauses.join(",")})`;
}
