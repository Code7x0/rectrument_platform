import assert from "node:assert/strict";
import test from "node:test";

import {
  AirtableOperationError,
  toUserFacingAirtableMessage,
} from "@/lib/airtable/errors";
import { actionErrorMessage } from "@/lib/actions/errors";

test("job claim Airtable errors surface claim-specific message", () => {
  const error = new AirtableOperationError(
    "Unable to create records in Job Claims. INVALID_VALUE",
    undefined,
    { operation: "create", tableName: "Job Claims" },
  );

  assert.equal(
    toUserFacingAirtableMessage(error),
    "Unable to submit your claim right now. Please try again.",
  );
  assert.equal(
    actionErrorMessage(error, "Unable to claim job"),
    "Unable to submit your claim right now. Please try again.",
  );
});

test("claim action fallback is not rewritten as a job save error", () => {
  const error = new AirtableOperationError(
    "Unable to list records in Job Claims. timeout",
    undefined,
    { operation: "list", tableName: "Job Claims" },
  );

  assert.equal(
    actionErrorMessage(error, "Unable to claim job"),
    "Unable to submit your claim right now. Please try again.",
  );
  assert.equal(
    actionErrorMessage(error, "Unable to claim job").includes(
      "Unable to save job",
    ),
    false,
  );
});
