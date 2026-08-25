export type PartnerQueryType =
  | "account_question"
  | "feedback"
  | "suggestion";

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
  account_question: "Account question",
  feedback: "Feedback",
  suggestion: "Suggestion",
};

export const PARTNER_QUERY_STATUS_LABELS: Record<PartnerQueryStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};
