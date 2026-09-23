import assert from "node:assert/strict";
import test from "node:test";

import { resolveDerivedReadStatus } from "./read-state";

test("resolveDerivedReadStatus honors mark-all timestamp", () => {
  const readAllBefore = new Date("2026-09-22T10:00:00.000Z");
  const context = {
    dismissed: new Set<string>(),
    readAllBefore,
  };
  assert.equal(
    resolveDerivedReadStatus(
      "derived_notif_rec1",
      "2026-09-20T08:00:00.000Z",
      context,
    ),
    "read",
  );
  assert.equal(
    resolveDerivedReadStatus(
      "derived_notif_rec2",
      "2026-09-22T11:00:00.000Z",
      context,
    ),
    "unread",
  );
});

test("resolveDerivedReadStatus honors explicit dismiss ids", () => {
  const context = {
    dismissed: new Set(["partner_notif_pn1"]),
    readAllBefore: null,
  };
  assert.equal(
    resolveDerivedReadStatus("partner_notif_pn1", "2026-09-23T00:00:00.000Z", context),
    "read",
  );
});
