import { formatTable } from "@/services/email/layout";

export type FieldChangeRow = {
  field: string;
  value: string;
};

/** Structured change table for job/client update emails. */
export function formatEntityChangeTable(
  entityId: string,
  changes: FieldChangeRow[],
): string {
  if (changes.length === 0) {
    return "";
  }
  return formatTable(
    ["ID", "Field Updated", "Present Value"],
    changes.map((row) => [entityId, row.field, row.value]),
  );
}
