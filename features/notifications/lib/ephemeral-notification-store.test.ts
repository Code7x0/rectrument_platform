import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

test("ephemeral notifications persist when Airtable table is absent", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "notif-store-"));
  process.env.NOTIFICATIONS_STORE_PATH = path.join(dir, "notifications.json");

  const store = await import(
    "@/features/notifications/lib/ephemeral-notification-store"
  );

  const first = await store.insertEphemeralNotification({
    recipientUserId: "am_user_1",
    title: "Job assigned",
    description: "You have been assigned Job BCE_003.",
    type: "job",
    category: "jobs",
    priority: "high",
    entityType: "job",
    entityId: "recJob1",
    actionUrl: "/account-manager/jobs",
  });

  assert.equal(first.readStatus, "unread");
  assert.match(first.id, /^ephemeral_notif_/);

  const listed = await store.listEphemeralNotificationsForRecipient("am_user_1");
  assert.equal(listed.length, 1);
  assert.equal(listed[0]!.title, "Job assigned");

  const duplicate = await store.insertEphemeralNotification({
    recipientUserId: "am_user_1",
    title: "Job assigned",
    description: "You have been assigned Job BCE_003.",
    type: "job",
    category: "jobs",
    priority: "high",
    entityType: "job",
    entityId: "recJob1",
    actionUrl: "/account-manager/jobs",
  });
  assert.equal(duplicate.id, first.id);

  const listedAgain = await store.listEphemeralNotificationsForRecipient("am_user_1");
  assert.equal(listedAgain.length, 1);
});
