export type PartnerQueryType =
  | "platform_feedback"
  | "job_candidate_query"
  | "account_admin_query";

export type PartnerQueryStatus = "open" | "answered" | "closed";

export interface PartnerQuery {
  id: string;
  recordId: string | null;
  partnerId: string;
  partnerCode: string;
  accountManagerId: string | null;
  type: PartnerQueryType;
  message: string;
  status: PartnerQueryStatus;
  amComments: string | null;
  submittedAt: string;
  answeredAt: string | null;
  answeredByUserId: string | null;
}

export const PARTNER_QUERY_TYPE_LABELS: Record<PartnerQueryType, string> = {
  platform_feedback: "Platform / process feedback",
  job_candidate_query: "Account / job / candidate query",
  account_admin_query: "Platform / process / payouts query",
};

export const PARTNER_QUERY_STATUS_LABELS: Record<PartnerQueryStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

/** Map legacy Airtable / stored values to the current query types. */
export function normalizePartnerQueryType(value: unknown): PartnerQueryType {
  const raw = String(value ?? "").trim();
  if (
    raw === "platform_feedback" ||
    raw === "job_candidate_query" ||
    raw === "account_admin_query"
  ) {
    return raw;
  }
  if (raw === "account_question") {
    return "job_candidate_query";
  }
  if (raw === "feedback" || raw === "suggestion") {
    return "platform_feedback";
  }
  return "platform_feedback";
}
