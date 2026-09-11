import assert from "node:assert/strict";
import test from "node:test";

import { isActiveAccountManagerForDigest } from "@/lib/email/recipients";

test("isActiveAccountManagerForDigest accepts active and blank AM status", () => {
  assert.equal(isActiveAccountManagerForDigest("Active", null), true);
  assert.equal(isActiveAccountManagerForDigest("", null), true);
  assert.equal(isActiveAccountManagerForDigest(null, null), true);
  assert.equal(isActiveAccountManagerForDigest("On Leave", null), true);
});

test("isActiveAccountManagerForDigest rejects inactive and pending invite", () => {
  assert.equal(isActiveAccountManagerForDigest("Inactive", null), false);
  assert.equal(
    isActiveAccountManagerForDigest("Inactive", "invite:abc:2099-01-01"),
    false,
  );
  assert.equal(
    isActiveAccountManagerForDigest("Active", "invite:abc:2099-01-01"),
    true,
  );
});
