/**
 * Application-side notification store when Airtable Notifications table is blank.
 * Mirrors the Job Claims JSON store pattern (/tmp on Vercel, data/ locally).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  CreateNotificationInput,
  Notification,
} from "@/features/notifications/types";
import { notificationFromCreateInput } from "@/features/notifications/services/notifications.mapper";

const STORE_VERSION = 1 as const;
const MAX_NOTIFICATIONS = 500;

interface EphemeralNotificationsStoreFile {
  version: typeof STORE_VERSION;
  notifications: Notification[];
}

let writeChain: Promise<unknown> = Promise.resolve();
let memoryStore: EphemeralNotificationsStoreFile | null = null;
let memoryStorePath: string | null = null;

function emptyStore(): EphemeralNotificationsStoreFile {
  return { version: STORE_VERSION, notifications: [] };
}

function cloneStore(store: EphemeralNotificationsStoreFile): EphemeralNotificationsStoreFile {
  return {
    version: STORE_VERSION,
    notifications: store.notifications.map((row) => ({ ...row })),
  };
}

function storePath(): string {
  const override = process.env.NOTIFICATIONS_STORE_PATH?.trim();
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override);
  }

  if (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NOTIFICATIONS_USE_TMP === "1"
  ) {
    return path.join("/tmp", "recruiting-platform-notifications.json");
  }

  return path.join(process.cwd(), "data", "notifications.json");
}

function normalizeStore(parsed: unknown): EphemeralNotificationsStoreFile {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as EphemeralNotificationsStoreFile).notifications)
  ) {
    return emptyStore();
  }
  const notifications = (parsed as EphemeralNotificationsStoreFile).notifications.filter(
    (row): row is Notification =>
      Boolean(row?.id && row.recipientUserId && row.title),
  );
  return { version: STORE_VERSION, notifications };
}

async function readStoreUnlocked(): Promise<EphemeralNotificationsStoreFile> {
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

async function writeStoreUnlocked(store: EphemeralNotificationsStoreFile): Promise<void> {
  const next = cloneStore(store);
  const filePath = storePath();
  memoryStore = next;
  memoryStorePath = filePath;
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const payload = JSON.stringify(next, null, 2);

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tmpPath, payload, "utf8");
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    console.error(
      "[notifications] ephemeral store write failed; using in-memory fallback",
      {
        path: filePath,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : "unknown",
      },
    );
    try {
      await fs.unlink(tmpPath);
    } catch {
      // ignore cleanup failures
    }
  }
}

function dedupeKey(row: Notification): string {
  return [
    row.recipientUserId,
    row.type,
    row.entityType ?? "",
    row.entityId ?? "",
    row.title,
  ].join("::");
}

function pruneStore(store: EphemeralNotificationsStoreFile): void {
  store.notifications.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  if (store.notifications.length > MAX_NOTIFICATIONS) {
    store.notifications = store.notifications.slice(0, MAX_NOTIFICATIONS);
  }
}

export async function insertEphemeralNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const notification = notificationFromCreateInput(
    input,
    `ephemeral_notif_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
  );

  let saved = notification;
  await withEphemeralNotificationStore(async (store) => {
    const key = dedupeKey(notification);
    const existing = store.notifications.find((row) => dedupeKey(row) === key);
    if (existing) {
      saved = existing;
      return;
    }
    store.notifications.unshift(notification);
    pruneStore(store);
  });

  return saved;
}

export async function listEphemeralNotificationsForRecipient(
  recipientUserId: string,
  options?: { maxRecords?: number },
): Promise<Notification[]> {
  const store = await readStoreUnlocked();
  const max = options?.maxRecords ?? 80;
  return store.notifications
    .filter((row) => row.recipientUserId === recipientUserId && !row.archived)
    .slice(0, max);
}

function withEphemeralNotificationStore<T>(
  fn: (store: EphemeralNotificationsStoreFile) => Promise<T> | T,
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
