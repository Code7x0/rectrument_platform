import test from "node:test";
import assert from "node:assert/strict";

import { shouldNotifyAccountManagerJobAssignment } from "@/features/notifications/lib/account-manager-assignment-notifications";

test("AM job-assignment emails only fire for admin-led assignment", () => {
  assert.equal(shouldNotifyAccountManagerJobAssignment("admin"), true);
  assert.equal(shouldNotifyAccountManagerJobAssignment("super_admin"), true);
  assert.equal(shouldNotifyAccountManagerJobAssignment("account_manager"), false);
  assert.equal(shouldNotifyAccountManagerJobAssignment("partner"), false);
  assert.equal(shouldNotifyAccountManagerJobAssignment(null), false);
  assert.equal(shouldNotifyAccountManagerJobAssignment(undefined), false);
});
