/**
 * Durable application-side store for Partner job claims.
 * Lives outside Airtable (no schema changes). Survives refresh / multi-session
 * on a single Node process / persistent disk. Override path with JOB_CLAIMS_STORE_PATH.
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

function storePath(): string {
  const override = process.env.JOB_CLAIMS_STORE_PATH?.trim();
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override);
  }
  return path.join(process.cwd(), "data", "job-claims.json");
}

function emptyStore(): JobClaimsStoreFile {
  return { version: STORE_VERSION, claims: [] };
}

async function ensureStoreFile(): Promise<string> {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(emptyStore(), null, 2), "utf8");
  }
  return filePath;
}

async function readStoreUnlocked(): Promise<JobClaimsStoreFile> {
  const filePath = await ensureStoreFile();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as JobClaimsStoreFile;
    if (!parsed || !Array.isArray(parsed.claims)) {
      return emptyStore();
    }
    return {
      version: STORE_VERSION,
      claims: parsed.claims.filter(
        (row): row is JobClaim =>
          Boolean(row?.id && row.partnerId && row.jobId && row.status),
      ),
    };
  } catch {
    return emptyStore();
  }
}

async function writeStoreUnlocked(store: JobClaimsStoreFile): Promise<void> {
  const filePath = await ensureStoreFile();
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const payload = JSON.stringify(
    { version: STORE_VERSION, claims: store.claims },
    null,
    2,
  );
  await fs.writeFile(tmpPath, payload, "utf8");
  await fs.rename(tmpPath, filePath);
}

/**
 * Serialize all store mutations so concurrent claim/approve calls do not clobber.
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

export async function readJobClaimsStore(): Promise<JobClaimsStoreFile> {
  return withJobClaimsStore((store) => structuredClone(store));
}

export function newClaimId(): string {
  return `clm_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
