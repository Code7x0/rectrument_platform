import {
  findPartnerQueryById,
  insertPartnerQuery,
  listAllPartnerQueries,
  listPartnerQueriesForPartner,
  replyToPartnerQuery,
} from "@/features/feedback/repositories/partner-queries.repository";
import type {
  PartnerQuery,
  PartnerQueryStatus,
  PartnerQueryType,
} from "@/features/feedback/types";

export async function listPartnerQueries(): Promise<PartnerQuery[]> {
  return listAllPartnerQueries();
}

export async function listQueriesForPartner(
  partnerId: string,
): Promise<PartnerQuery[]> {
  return listPartnerQueriesForPartner(partnerId);
}

export async function getPartnerQueryById(
  queryId: string,
): Promise<PartnerQuery | null> {
  return findPartnerQueryById(queryId);
}

export async function createPartnerQuery(input: {
  partnerId: string;
  partnerCode: string;
  accountManagerId: string | null;
  type: PartnerQueryType;
  message: string;
}): Promise<PartnerQuery> {
  return insertPartnerQuery(input);
}

export async function answerPartnerQuery(
  queryId: string,
  input: {
    amComments: string;
    answeredByUserId: string;
    accountManagerId?: string | null;
    status?: PartnerQueryStatus;
  },
): Promise<PartnerQuery> {
  return replyToPartnerQuery(queryId, input);
}
