import { listActiveAllocationsForPartner } from "@/features/allocations/services";
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

/** Job/candidate queries for partners allocated to this Account Manager. */
export async function listQueriesForAccountManager(
  accountManagerId: string,
): Promise<PartnerQuery[]> {
  const amId = accountManagerId.trim();
  if (!amId) {
    return [];
  }

  const all = await listAllPartnerQueries();
  const jobQueries = all.filter((row) => row.type === "job_candidate_query");
  if (jobQueries.length === 0) {
    return [];
  }

  const partnerIds = new Set<string>();
  const partnerIdList = [
    ...new Set(jobQueries.map((row) => row.partnerId).filter(Boolean)),
  ];
  await Promise.all(
    partnerIdList.map(async (partnerId) => {
      const allocations = await listActiveAllocationsForPartner(partnerId);
      if (allocations.some((row) => row.accountManagerId === amId)) {
        partnerIds.add(partnerId);
      }
    }),
  );

  return jobQueries.filter((row) => partnerIds.has(row.partnerId));
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
