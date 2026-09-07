import type { AppSession } from "@/types";
import {
  resolveAccountManagerScopeId,
  resolvePartnerScopeId,
} from "@/lib/auth";
import { isElevatedStaff } from "@/lib/auth/scope";

const AUTH_CACHE_TTL_MS = 60_000;
const authCache = new Map<string, { allowed: boolean; expiresAt: number }>();

export function normalizeAttachmentUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function urlMatches(
  candidate: string | null | undefined,
  targetNormalized: string,
): boolean {
  if (!candidate?.trim()) {
    return false;
  }
  return normalizeAttachmentUrl(candidate) === targetNormalized;
}

function collectUrl(
  urls: Set<string>,
  value: string | null | undefined,
): void {
  if (value?.trim()) {
    urls.add(normalizeAttachmentUrl(value));
  }
}

function collectJobDocuments(
  urls: Set<string>,
  documents: Array<{ url?: string | null }> | null | undefined,
): void {
  for (const doc of documents ?? []) {
    collectUrl(urls, doc.url ?? null);
  }
}

async function collectPartnerVisibleUrls(
  partnerId: string,
  urls: Set<string>,
): Promise<void> {
  const { listPartnerSubmissions } = await import(
    "@/features/submissions/services/submissions.service"
  );
  const { listDocumentsForPartner } = await import(
    "@/features/partner-documents/services/documents.service"
  );
  const { listActiveAllocationsForPartner } = await import(
    "@/features/allocations/services/allocations.service"
  );
  const { getJobById } = await import("@/features/jobs/services");
  const { listPartnerAvailableJobs } = await import(
    "@/features/job-claims/services/job-claims.service"
  );

  const [submissions, documents, allocations, availableJobs] = await Promise.all([
    listPartnerSubmissions(partnerId),
    listDocumentsForPartner(partnerId),
    listActiveAllocationsForPartner(partnerId),
    listPartnerAvailableJobs(partnerId),
  ]);

  for (const submission of submissions) {
    collectUrl(urls, submission.resumeUrl);
  }

  for (const document of documents) {
    collectUrl(urls, document.fileUrl);
  }

  const jobIds = new Set<string>();
  for (const allocation of allocations) {
    jobIds.add(allocation.jobId);
  }
  for (const job of availableJobs) {
    jobIds.add(job.id);
    collectJobDocuments(urls, job.documents);
  }

  await Promise.all(
    [...jobIds].map(async (jobId) => {
      const job = await getJobById(jobId);
      if (job) {
        collectJobDocuments(urls, job.documents);
      }
    }),
  );
}

async function collectAccountManagerVisibleUrls(
  accountManagerId: string,
  urls: Set<string>,
): Promise<void> {
  const { listJobs } = await import("@/features/jobs/services");
  const { listClients } = await import("@/features/clients/services");
  const { findSubmissionsSafe } = await import(
    "@/features/submissions/repositories/submissions.repository"
  );
  const { listDocuments } = await import(
    "@/features/partner-documents/services/documents.service"
  );

  const [jobs, clients, submissions, documents] = await Promise.all([
    listJobs({ accountManagerId, includeArchived: true }),
    listClients({ accountManagerId, includeArchived: true }),
    findSubmissionsSafe({ maxRecords: 500 }),
    listDocuments(),
  ]);

  const ownedJobIds = new Set(jobs.map((job) => job.id));

  for (const job of jobs) {
    collectJobDocuments(urls, job.documents);
  }

  for (const client of clients) {
    for (const file of client.briefDeck ?? []) {
      collectUrl(urls, file.url);
    }
  }

  for (const submission of submissions) {
    if (!submission.jobId || !ownedJobIds.has(submission.jobId)) {
      continue;
    }
    collectUrl(urls, submission.resumeUrl);
  }

  for (const document of documents) {
    collectUrl(urls, document.fileUrl);
  }
}

/**
 * Verify the signed-in user may proxy an Airtable attachment URL.
 * Elevated staff may access any allowlisted attachment URL.
 */
export async function canAccessAttachmentUrl(
  session: AppSession,
  url: string,
): Promise<boolean> {
  const normalized = normalizeAttachmentUrl(url);
  const cacheKey = `${session.userId}::${normalized}`;
  const cached = authCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  let allowed = false;

  if (isElevatedStaff(session)) {
    allowed = true;
  } else if (session.role === "partner") {
    const partnerId = resolvePartnerScopeId(session);
    if (partnerId) {
      const urls = new Set<string>();
      await collectPartnerVisibleUrls(partnerId, urls);
      allowed = urls.has(normalized);
    }
  } else if (session.role === "account_manager") {
    const accountManagerId = resolveAccountManagerScopeId(session);
    if (accountManagerId) {
      const urls = new Set<string>();
      await collectAccountManagerVisibleUrls(accountManagerId, urls);
      allowed = urls.has(normalized);
    }
  }

  authCache.set(cacheKey, {
    allowed,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });

  if (authCache.size > 500) {
    const now = Date.now();
    for (const [key, value] of authCache) {
      if (value.expiresAt <= now) {
        authCache.delete(key);
      }
    }
  }

  return allowed;
}
