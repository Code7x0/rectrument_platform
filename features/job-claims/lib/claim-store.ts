/**
 * Durable application-side store for Partner job claims.
 * Lives outside Airtable (no schema changes).
 *
 * Path resolution:
 * 1. JOB_CLAIMS_STORE_PATH when set
 * 2. /tmp/job-claims.json on Vercel / Lambda (cwd is often read-only)
 * 3. <cwd>/data/job-claims.json locally
 *
 * Reads never require write access. Writes fall back to in-memory when the
 * filesystem is unavailable so Available Jobs can still render.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  JobClaim,
  JobClaimsStoreFile,
} from "@/features/job-claims/types";

const STORE_VERSION = 1 as const;

let writeChain: Promise<unknown> = Promise.resolve();
let memoryStore: JobClaimsStoreFile | null = null;
let memoryStorePath: string | null = null;

function emptyStore(): JobClaimsStoreFile {
  return { version: STORE_VERSION, claims: [] };
}

function cloneStore(store: JobClaimsStoreFile): JobClaimsStoreFile {
  return {
    version: STORE_VERSION,
    claims: store.claims.map((claim) => ({ ...claim })),
  };
}

function storePath(): string {
  const override = process.env.JOB_CLAIMS_STORE_PATH?.trim();
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override);
  }

  // Serverless / ephemeral hosts: prefer /tmp over read-only project cwd.
  if (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.JOB_CLAIMS_USE_TMP === "1"
  ) {
    return path.join("/tmp", "recruiting-platform-job-claims.json");
  }

  return path.join(process.cwd(), "data", "job-claims.json");
}

function normalizeStore(parsed: unknown): JobClaimsStoreFile {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as JobClaimsStoreFile).claims)
  ) {
    return emptyStore();
  }
  const claims = (parsed as JobClaimsStoreFile).claims.filter(
    (row): row is JobClaim =>
      Boolean(row?.id && row.partnerId && row.jobId && row.status),
  );
  return { version: STORE_VERSION, claims };
}

/** Read-only — never creates or writes the store file. */
async function readStoreUnlocked(): Promise<JobClaimsStoreFile> {
  const filePath = storePath();

  if (memoryStore && memoryStorePath === filePath) {
    return cloneStore(memoryStore);
  }

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const store = normalizeStore(JSON.parse(raw) as unknown);
    memoryStore = cloneStore(store);
    memoryStorePath = filePath;
    return cloneStore(store);
  } catch {
    memoryStore = null;
    memoryStorePath = filePath;
    return emptyStore();
  }
}

async function writeStoreUnlocked(store: JobClaimsStoreFile): Promise<void> {
  const next = cloneStore(store);
  const filePath = storePath();
  memoryStore = next;
  memoryStorePath = filePath;
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const payload = JSON.stringify(
    { version: STORE_VERSION, claims: next.claims },
    null,
    2,
  );

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmpPath, payload, "utf8");
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    // Keep serving from memory so Partner Available Jobs still loads.
    console.error("[job-claims] store write failed; using in-memory fallback", {
      path: filePath,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : "unknown",
    });
    try {
      await fs.unlink(tmpPath);
    } catch {
      // ignore cleanup failures
    }
  }
}

/**
 * Serialize store mutations so concurrent claim/approve calls do not clobber.
 */
export function withJobClaimsStore<T>(
  fn: (store: JobClaimsStoreFile) => Promise<T> | T,
): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await readStoreUnlocked();
    const result = await fn(store);
    await writeStoreUnlocked(store);
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Pure read — does not write the store file. */
export async function readJobClaimsStore(): Promise<JobClaimsStoreFile> {
  return readStoreUnlocked();
}

export function newClaimId(): string {
  return `clm_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
