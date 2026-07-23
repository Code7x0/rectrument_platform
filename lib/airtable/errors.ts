/**
 * Typed Airtable / storage availability errors for repository soft-fail paths.
 * Callers should catch these and surface friendly UI messages — never raw stacks.
 */

export class AirtableStorageUnavailableError extends Error {
  readonly code = "AIRTABLE_STORAGE_UNAVAILABLE";
  readonly tableKey: string;

  constructor(tableKey: string, message?: string) {
    super(
      message ??
        `${tableKey} is not configured on this Airtable base. Feature storage is unavailable.`,
    );
    this.name = "AirtableStorageUnavailableError";
    this.tableKey = tableKey;
  }
}

export class AirtableOperationError extends Error {
  readonly code = "AIRTABLE_OPERATION_ERROR";
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AirtableOperationError";
    this.cause = cause;
  }
}

export function isStorageUnavailable(
  error: unknown,
): error is AirtableStorageUnavailableError {
  return error instanceof AirtableStorageUnavailableError;
}

export function toUserFacingAirtableMessage(error: unknown): string {
  if (isStorageUnavailable(error)) {
    return "This feature is not available on the connected Airtable base. Contact an administrator.";
  }
  if (error instanceof AirtableOperationError) {
    return "Unable to save or load data right now. Please try again.";
  }
  if (error instanceof Error && error.message.startsWith("Missing required")) {
    return "This feature is not connected to Airtable yet. Contact an administrator.";
  }
  return "Something went wrong loading data. Please try again.";
}
