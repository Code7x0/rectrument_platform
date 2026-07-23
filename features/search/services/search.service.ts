import { listAllocations } from "@/features/allocations/services";
import { findCandidates } from "@/features/candidates/repositories/candidates.repository";
import { listClients } from "@/features/clients/services";
import { listJobs } from "@/features/jobs/services";
import { listDocuments } from "@/features/partner-documents/services";
import { DOCUMENT_TYPE_LABELS } from "@/features/partner-documents/types";
import { listPartners } from "@/features/partners/services";
import { listPayouts } from "@/features/payouts/services";
import {
  matchScore,
  sortResults,
  withActivityBonus,
} from "@/features/search/services/ranking";
import { entityUrl, roleBasePath } from "@/features/search/services/urls";
import type {
  GlobalSearchInput,
  GlobalSearchResponse,
  SearchEntityType,
  SearchFilterChip,
  SearchResult,
  SearchResultGroup,
  SearchResultGroupId,
} from "@/features/search/types";
import {
  ENTITY_TO_GROUP,
  SEARCH_GROUP_LABELS,
} from "@/features/search/types";
import { SETTINGS_SECTION_META } from "@/features/settings/types";
import { canAccessSettings } from "@/features/settings/services";
import { listSubmissions } from "@/features/submissions/services";
import { listNotificationsForUser } from "@/features/notifications/services";
import { ACTIVITY_ACTION_LABELS } from "@/features/activity/types";
import { CANDIDATES_TABLE_FIELDS } from "@/lib/airtable/fields";
import { listUsers } from "@/services/users/users.service";
import type { AppSession } from "@/types";
import { isAdmin } from "@/lib/auth/permissions";

const MODAL_LIMIT = 5;
const PAGE_LIMIT = 20;
const FETCH_CAP = 80;

function escapeFormula(value: string): string {
  return value.replace(/'/g, "\\'");
}

function includesFilter(
  filter: SearchFilterChip,
  entityType: SearchEntityType,
): boolean {
  if (filter === "all") {
    return true;
  }
  const map: Record<Exclude<SearchFilterChip, "all">, SearchEntityType[]> = {
    clients: ["client"],
    jobs: ["job"],
    partners: ["partner"],
    candidates: ["candidate", "submission"],
    documents: ["document"],
    payouts: ["payout"],
    activities: ["activity"],
    notifications: ["notification"],
    settings: ["settings"],
  };
  return map[filter].includes(entityType);
}

function makeResult(
  input: {
    id: string;
    title: string;
    subtitle?: string | null;
    entityType: SearchEntityType;
    status?: string | null;
    badge?: string | null;
    matchedField?: string | null;
    metadata?: Record<string, string> | null;
    score: number;
    updatedAt?: string | null;
    session: AppSession;
    urlOverride?: string;
  },
): SearchResult | null {
  if (input.score <= 0) {
    return null;
  }
  return {
    id: `${input.entityType}:${input.id}`,
    title: input.title,
    subtitle: input.subtitle ?? null,
    entityType: input.entityType,
    status: input.status ?? null,
    url:
      input.urlOverride ??
      entityUrl(input.session, input.entityType, input.id),
    icon: input.entityType,
    badge: input.badge ?? input.status ?? null,
    matchedField: input.matchedField ?? null,
    metadata: input.metadata ?? null,
    score: withActivityBonus(
      input.score,
      input.status,
      input.updatedAt,
    ),
    updatedAt: input.updatedAt ?? null,
  };
}

function groupResults(
  items: SearchResult[],
  limit: number,
): SearchResultGroup[] {
  const buckets = new Map<SearchResultGroupId, SearchResult[]>();
  for (const item of items) {
    const groupId = ENTITY_TO_GROUP[item.entityType];
    const list = buckets.get(groupId) ?? [];
    list.push(item);
    buckets.set(groupId, list);
  }

  const order: SearchResultGroupId[] = [
    "clients",
    "jobs",
    "partners",
    "account_managers",
    "users",
    "allocations",
    "candidates",
    "submissions",
    "documents",
    "payouts",
    "activities",
    "notifications",
    "settings",
  ];

  return order
    .map((id) => {
      const all = sortResults(buckets.get(id) ?? []);
      if (all.length === 0) {
        return null;
      }
      return {
        id,
        label: SEARCH_GROUP_LABELS[id],
        items: all.slice(0, limit),
        total: all.length,
        hasMore: all.length > limit,
      } satisfies SearchResultGroup;
    })
    .filter((group): group is SearchResultGroup => Boolean(group));
}

async function searchClients(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  if (!isAdmin(session.role) && session.role !== "account_manager") {
    return [];
  }

  const clients = await listClients({
    search: query,
    includeArchived: false,
  });

  let scoped = clients;
  if (session.role === "account_manager") {
    const jobs = await listJobs({
      accountManagerId: session.userId,
      includeArchived: true,
    });
    const clientIds = new Set(
      jobs.map((job) => job.clientId).filter(Boolean),
    );
    scoped = clients.filter((client) => clientIds.has(client.id));
  }

  return scoped
    .map((client) => {
      const match = matchScore(query, [
        { value: client.name, field: "name" },
        { value: client.clientCode, field: "code" },
        { value: client.industry, field: "industry" },
        { value: client.primaryContact, field: "contact" },
      ]);
      return makeResult({
        id: client.id,
        title: client.name,
        subtitle: client.industry ?? client.clientCode,
        entityType: "client",
        status: client.status,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: null,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchJobs(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  const filters =
    session.role === "account_manager"
      ? { search: query, accountManagerId: session.userId }
      : session.role === "partner"
        ? { search: query }
        : { search: query };

  let jobs = await listJobs(filters);

  if (session.role === "partner") {
    if (!session.partnerId) {
      return [];
    }
    const allocations = await listAllocations({
      partnerId: session.partnerId,
    });
    const jobIds = new Set(allocations.map((row) => row.jobId));
    jobs = jobs.filter((job) => jobIds.has(job.id));
  }

  return jobs
    .map((job) => {
      const match = matchScore(query, [
        { value: job.title, field: "title" },
        { value: job.jobCode, field: "code" },
        { value: job.clientName, field: "client" },
        { value: job.location, field: "location" },
      ]);
      return makeResult({
        id: job.id,
        title: job.title,
        subtitle: job.clientName ?? job.jobCode,
        entityType: "job",
        status: job.status,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: job.createdAt,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchPartners(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  if (session.role === "partner") {
    return [];
  }

  if (session.role === "account_manager") {
    const jobs = await listJobs({
      accountManagerId: session.userId,
      includeArchived: true,
    });
    const jobIds = new Set(jobs.map((job) => job.id));
    const allocations = await listAllocations({});
    const partnerIds = new Set(
      allocations
        .filter((row) => jobIds.has(row.jobId))
        .map((row) => row.partnerId),
    );
    const partners = await listPartners({ search: query });
    return partners
      .filter((partner) => partnerIds.has(partner.id))
      .map((partner) => {
        const match = matchScore(query, [
          { value: partner.companyName, field: "company" },
          { value: partner.contactName, field: "contact" },
          { value: partner.partnerCode, field: "code" },
        ]);
        return makeResult({
          id: partner.id,
          title: partner.partnerCode ?? partner.id,
          subtitle: "Assigned partner",
          entityType: "partner",
          status: partner.status,
          score: match.score,
          matchedField: match.matchedField,
          session,
        });
      })
      .filter((row): row is SearchResult => Boolean(row));
  }

  if (!isAdmin(session.role)) {
    return [];
  }

  const partners = await listPartners({ search: query });
  return partners
    .map((partner) => {
      const match = matchScore(query, [
        { value: partner.companyName, field: "company" },
        { value: partner.contactName, field: "contact" },
        { value: partner.partnerCode, field: "code" },
        { value: partner.email, field: "email" },
      ]);
      return makeResult({
        id: partner.id,
        title: partner.companyName,
        subtitle: partner.contactName ?? partner.partnerCode,
        entityType: "partner",
        status: partner.status,
        score: match.score,
        matchedField: match.matchedField,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchUsersAndManagers(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  if (!isAdmin(session.role)) {
    return [];
  }

  const users = await listUsers({ search: query });
  return users
    .map((user) => {
      const match = matchScore(query, [
        { value: user.fullName, field: "name" },
        { value: user.email, field: "email" },
      ]);
      const entityType: SearchEntityType =
        user.role === "account_manager" ? "account_manager" : "user";
      return makeResult({
        id: user.id,
        title: user.fullName,
        subtitle: user.email,
        entityType,
        status: user.status,
        badge: user.role,
        score: match.score,
        matchedField: match.matchedField,
        session,
        urlOverride: roleBasePath(session.role).users,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchAllocations(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  if (session.role === "partner") {
    if (!session.partnerId) {
      return [];
    }
    const rows = await listAllocations({
      partnerId: session.partnerId,
      search: query,
    });
    return rows
      .map((row) => {
        const match = matchScore(query, [
          { value: row.allocationCode, field: "code" },
          { value: row.jobTitle, field: "job" },
          { value: row.jobCode, field: "jobCode" },
        ]);
        return makeResult({
          id: row.id,
          title: row.jobTitle ?? row.allocationCode ?? "Allocation",
          subtitle: row.allocationCode,
          entityType: "allocation",
          status: row.status,
          score: match.score,
          matchedField: match.matchedField,
          updatedAt: row.assignedDate,
          session,
        });
      })
      .filter((row): row is SearchResult => Boolean(row));
  }

  if (session.role === "account_manager") {
    const jobs = await listJobs({
      accountManagerId: session.userId,
      includeArchived: true,
    });
    const jobIds = new Set(jobs.map((job) => job.id));
    const rows = await listAllocations({ search: query });
    return rows
      .filter((row) => jobIds.has(row.jobId))
      .map((row) => {
        const match = matchScore(query, [
          { value: row.allocationCode, field: "code" },
          { value: row.jobTitle, field: "job" },
          { value: row.partnerCode, field: "partner" },
        ]);
        return makeResult({
          id: row.id,
          title: row.jobTitle ?? row.allocationCode ?? "Allocation",
          subtitle: row.partnerCode ?? row.allocationCode,
          entityType: "allocation",
          status: row.status,
          score: match.score,
          matchedField: match.matchedField,
          updatedAt: row.assignedDate,
          session,
        });
      })
      .filter((row): row is SearchResult => Boolean(row));
  }

  if (!isAdmin(session.role)) {
    return [];
  }

  const rows = await listAllocations({
    search: query,
    includePartnerIdentity: true,
  });
  return rows
    .map((row) => {
      const match = matchScore(query, [
        { value: row.allocationCode, field: "code" },
        { value: row.jobTitle, field: "job" },
        { value: row.partnerName, field: "partner" },
        { value: row.partnerCode, field: "partnerCode" },
      ]);
      return makeResult({
        id: row.id,
        title: row.jobTitle ?? row.allocationCode ?? "Allocation",
        subtitle: row.partnerName ?? row.partnerCode,
        entityType: "allocation",
        status: row.status,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: row.assignedDate,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchSubmissionsAndCandidates(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  let submissions = await listSubmissions(
    session.role === "partner" && session.partnerId
      ? { partnerId: session.partnerId }
      : {},
  );

  if (session.role === "account_manager") {
    const jobs = await listJobs({
      accountManagerId: session.userId,
      includeArchived: true,
    });
    const jobIds = new Set(jobs.map((job) => job.id));
    submissions = submissions.filter((row) => jobIds.has(row.jobId));
  }

  const submissionResults = submissions
    .map((row) => {
      const match = matchScore(query, [
        { value: row.candidateName, field: "candidate" },
        { value: row.jobTitle, field: "job" },
        { value: row.submissionCode, field: "code" },
        { value: row.partnerName, field: "partner" },
      ]);
      return makeResult({
        id: row.id,
        title: row.candidateName ?? "Submission",
        subtitle: row.jobTitle ?? row.submissionCode,
        entityType: "submission",
        status: row.status,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: row.submissionDate,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));

  const candidateMap = new Map<string, SearchResult>();
  for (const row of submissions) {
    if (!row.candidateId) {
      continue;
    }
    const match = matchScore(query, [
      { value: row.candidateName, field: "name" },
    ]);
    if (match.score <= 0) {
      continue;
    }
    const result = makeResult({
      id: row.candidateId,
      title: row.candidateName ?? "Candidate",
      subtitle: row.jobTitle,
      entityType: "candidate",
      status: row.status,
      score: match.score,
      matchedField: match.matchedField,
      updatedAt: row.submissionDate,
      session,
    });
    if (result && !candidateMap.has(row.candidateId)) {
      candidateMap.set(row.candidateId, result);
    }
  }

  if (isAdmin(session.role)) {
    try {
      const q = escapeFormula(query.trim());
      const rows = await findCandidates({
        filterByFormula: `OR(FIND(LOWER('${q}'), LOWER({${CANDIDATES_TABLE_FIELDS.fullName}})), FIND(LOWER('${q}'), LOWER({${CANDIDATES_TABLE_FIELDS.email}})), FIND(LOWER('${q}'), LOWER({${CANDIDATES_TABLE_FIELDS.phone}})))`,
        maxRecords: 30,
      });
      for (const candidate of rows) {
        const match = matchScore(query, [
          { value: candidate.fullName, field: "name" },
          { value: candidate.email, field: "email" },
          { value: candidate.phone, field: "phone" },
        ]);
        const result = makeResult({
          id: candidate.id,
          title: candidate.fullName,
          subtitle: candidate.email,
          entityType: "candidate",
          status: null,
          score: match.score,
          matchedField: match.matchedField,
          session,
        });
        if (result) {
          candidateMap.set(candidate.id, result);
        }
      }
    } catch {
      // Candidate table filter optional
    }
  }

  return [...submissionResults, ...candidateMap.values()];
}

async function searchDocuments(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  let documents =
    session.role === "partner" && session.partnerId
      ? await listDocuments({ partnerId: session.partnerId })
      : isAdmin(session.role) || session.role === "account_manager"
        ? await listDocuments({})
        : [];

  if (session.role === "account_manager") {
    // AM may review docs; keep list but avoid partner identity leakage in subtitle
    documents = documents.slice(0, FETCH_CAP);
  }

  return documents
    .map((doc) => {
      const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType];
      const match = matchScore(query, [
        { value: typeLabel, field: "type" },
        { value: doc.fileName, field: "file" },
        { value: doc.partnerName, field: "partner" },
        { value: doc.documentCode, field: "code" },
      ]);
      return makeResult({
        id: doc.id,
        title: typeLabel,
        subtitle:
          session.role === "account_manager"
            ? doc.documentCode
            : (doc.partnerName ?? doc.fileName),
        entityType: "document",
        status: doc.verificationStatus,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: doc.uploadedAt,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchPayouts(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  let payouts =
    session.role === "partner" && session.partnerId
      ? await listPayouts({ partnerId: session.partnerId })
      : session.role === "account_manager"
        ? await listPayouts({ accountManagerId: session.userId })
        : isAdmin(session.role)
          ? await listPayouts({
              includePartnerIdentity: true,
              search: query,
            })
          : [];

  if (session.role !== "admin" && session.role !== "super_admin") {
    // apply in-memory search when list API search not used
    payouts = payouts.filter((row) => {
      const match = matchScore(query, [
        { value: row.candidateName, field: "candidate" },
        { value: row.jobTitle, field: "job" },
        { value: row.payoutCode, field: "code" },
        { value: row.partnerCode, field: "partner" },
      ]);
      return match.score > 0;
    });
  }

  return payouts
    .map((row) => {
      const match = matchScore(query, [
        { value: row.candidateName, field: "candidate" },
        { value: row.jobTitle, field: "job" },
        { value: row.payoutCode, field: "code" },
        { value: row.partnerName, field: "partner" },
        { value: row.partnerCode, field: "partnerCode" },
      ]);
      return makeResult({
        id: row.id,
        title: row.candidateName ?? row.payoutCode ?? "Payout",
        subtitle: row.jobTitle ?? row.payoutCode,
        entityType: "payout",
        status: row.payoutStatus,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: row.lastUpdated,
        session,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchNotifications(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  const result = await listNotificationsForUser({
    recipientUserId: session.userId,
    archived: false,
    page: 1,
    pageSize: FETCH_CAP,
  });

  return result.items
    .map((row) => {
      const match = matchScore(query, [
        { value: row.title, field: "title" },
        { value: row.description, field: "description" },
      ]);
      return makeResult({
        id: row.id,
        title: row.title,
        subtitle: row.description,
        entityType: "notification",
        status: row.readStatus,
        score: match.score,
        matchedField: match.matchedField,
        updatedAt: row.createdAt,
        session,
        urlOverride: row.actionUrl ?? "/notifications",
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

async function searchActivities(
  session: AppSession,
  query: string,
): Promise<SearchResult[]> {
  const { getGlobalTimeline } = await import(
    "@/features/activity/services"
  );
  const timeline = await getGlobalTimeline(session, {
    search: query,
    page: 1,
    pageSize: FETCH_CAP,
  });

  return timeline.items
    .map((row) => {
      const match = matchScore(query, [
        { value: row.title, field: "title" },
        { value: row.summary, field: "summary" },
        { value: row.actorName, field: "actor" },
        {
          value: ACTIVITY_ACTION_LABELS[row.action] ?? row.action,
          field: "action",
        },
      ]);
      return makeResult({
        id: row.id,
        title: row.title,
        subtitle: row.summary ?? row.actorName,
        entityType: "activity",
        status: row.toStatus,
        score: match.score || (query ? 0 : 1),
        matchedField: match.matchedField,
        updatedAt: row.createdAt,
        session,
        urlOverride: "/activities",
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

function searchSettings(
  session: AppSession,
  query: string,
): SearchResult[] {
  if (!canAccessSettings(session.role)) {
    return [];
  }

  return Object.entries(SETTINGS_SECTION_META)
    .map(([id, meta]) => {
      const match = matchScore(query, [
        { value: meta.title, field: "title" },
        { value: meta.description, field: "description" },
        { value: id, field: "id" },
      ]);
      return makeResult({
        id: meta.href,
        title: meta.title,
        subtitle: meta.description,
        entityType: "settings",
        status: null,
        badge: "Settings",
        score: match.score,
        matchedField: match.matchedField,
        session,
        urlOverride: meta.href,
      });
    })
    .filter((row): row is SearchResult => Boolean(row));
}

/**
 * GlobalSearchService — parallel, permission-aware orchestration.
 */
export async function globalSearch(
  session: AppSession,
  input: GlobalSearchInput,
): Promise<GlobalSearchResponse> {
  const started = Date.now();
  const query = input.query.trim();
  const filter = input.filter ?? "all";
  const limit = input.mode === "page" ? PAGE_LIMIT : MODAL_LIMIT;

  if (!query) {
    return {
      query: "",
      filter,
      groups: [],
      total: 0,
      tookMs: Date.now() - started,
    };
  }

  const tasks: Array<Promise<SearchResult[]>> = [];

  if (includesFilter(filter, "client")) {
    tasks.push(searchClients(session, query));
  }
  if (includesFilter(filter, "job")) {
    tasks.push(searchJobs(session, query));
  }
  if (includesFilter(filter, "partner")) {
    tasks.push(searchPartners(session, query));
  }
  if (filter === "all") {
    tasks.push(searchUsersAndManagers(session, query));
    tasks.push(searchAllocations(session, query));
  }
  if (
    includesFilter(filter, "candidate") ||
    includesFilter(filter, "submission")
  ) {
    tasks.push(searchSubmissionsAndCandidates(session, query));
  }
  if (includesFilter(filter, "document")) {
    tasks.push(searchDocuments(session, query));
  }
  if (includesFilter(filter, "payout")) {
    tasks.push(searchPayouts(session, query));
  }
  if (includesFilter(filter, "notification")) {
    tasks.push(searchNotifications(session, query));
  }
  if (includesFilter(filter, "activity")) {
    tasks.push(searchActivities(session, query));
  }
  if (includesFilter(filter, "settings")) {
    tasks.push(Promise.resolve(searchSettings(session, query)));
  }

  const settled = await Promise.all(
    tasks.map(async (task) => {
      try {
        return await task;
      } catch (error) {
        console.error("[search] segment failed", error);
        return [] as SearchResult[];
      }
    }),
  );

  const merged = sortResults(settled.flat());
  const groups = groupResults(merged, limit);

  return {
    query,
    filter,
    groups,
    total: merged.length,
    tookMs: Date.now() - started,
  };
}
