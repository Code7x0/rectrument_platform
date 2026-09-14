import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendPartnerNotifMarker,
  buildPartnerNotifMarker,
  parsePartnerNotifMarkers,
} from "@/lib/airtable/field-markers";

describe("partner notification markers", () => {
  it("round-trips job and client notifications", () => {
    const line = buildPartnerNotifMarker({
      id: "pn_test",
      at: "2026-09-14T12:00:00.000Z",
      type: "job",
      entityType: "job",
      entityId: "recJob1",
      title: "Job updated",
      description: "Priority: High",
      actionUrl: "/partner/jobs",
    });
    const notes = appendPartnerNotifMarker("Human note", {
      id: "pn_test",
      at: "2026-09-14T12:00:00.000Z",
      type: "job",
      entityType: "job",
      entityId: "recJob1",
      title: "Job updated",
      description: "Priority: High",
      actionUrl: "/partner/jobs",
    });
    const parsed = parsePartnerNotifMarkers(notes);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.title, "Job updated");
    assert.equal(parsed[0]?.entityId, "recJob1");
    assert.ok(notes.includes("Human note"));
    assert.ok(notes.includes("[RP_PARTNER_NOTIF]"));
  });
});
