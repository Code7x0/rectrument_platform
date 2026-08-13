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
  readonly operation?: string;
  readonly tableName?: string;
  readonly recordId?: string | null;
  readonly fieldName?: string | null;

  constructor(
    message: string,
    cause?: unknown,
    meta?: {
      operation?: string;
      tableName?: string;
      recordId?: string | null;
      fieldName?: string | null;
    },
  ) {
    super(message);
    this.name = "AirtableOperationError";
    this.cause = cause;
    this.operation = meta?.operation;
    this.tableName = meta?.tableName;
    this.recordId = meta?.recordId ?? null;
    this.fieldName = meta?.fieldName ?? null;
  }
}

export function isStorageUnavailable(
  error: unknown,
): error is AirtableStorageUnavailableError {
  return error instanceof AirtableStorageUnavailableError;
}

function looksLikeUnknownField(message: string): boolean {
  return /UNKNOWN_FIELD_NAME|Unknown field name/i.test(message);
}

export function toUserFacingAirtableMessage(error: unknown): string {
  if (isStorageUnavailable(error)) {
    return "This feature is not available on the connected Airtable base. Contact an administrator.";
  }
  if (error instanceof AirtableOperationError) {
    if (looksLikeUnknownField(error.message) || error.fieldName) {
      return "Unable to save job. Please check the job details and try again.";
    }
    return "Unable to save or load data right now. Please try again.";
  }
  if (error instanceof Error && error.message.startsWith("Missing required")) {
    return "This feature is not connected to Airtable yet. Contact an administrator.";
  }
  return "Something went wrong loading data. Please try again.";
}
