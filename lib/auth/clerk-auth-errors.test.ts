import assert from "node:assert/strict";
import test from "node:test";

import {
  clerkErrorMessage,
  isExistingClerkAccountError,
  isMissingClerkAccountError,
  isSignUpRestrictedError,
} from "@/lib/auth/clerk-auth-errors";

test("clerk auth error helpers detect missing and existing accounts", () => {
  assert.equal(
    isMissingClerkAccountError({
      errors: [{ code: "form_identifier_not_found" }],
    }),
    true,
  );
  assert.equal(
    isMissingClerkAccountError({
      errors: [{ message: "Couldn't find your account." }],
    }),
    true,
  );
  assert.equal(
    isExistingClerkAccountError({
      errors: [{ code: "form_identifier_exists" }],
    }),
    true,
  );
  assert.equal(
    isSignUpRestrictedError({
      errors: [{ code: "sign_up_restricted" }],
    }),
    true,
  );
  assert.equal(
    clerkErrorMessage({
      errors: [{ longMessage: "Email is invalid" }],
    }),
    "Email is invalid",
  );
});
