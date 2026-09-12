import assert from "node:assert/strict";
import test from "node:test";

import { preparePartnerSignIn } from "@/lib/auth/sync-partner-sign-in";

test("preparePartnerSignIn rejects empty email", async () => {
  const result = await preparePartnerSignIn("   ");
  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
});
