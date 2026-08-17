/**
 * Build an Airtable filter for one or more record IDs.
 * Prefer this over downloading an entire table when the ID set is small.
 */
export function buildRecordIdOrFormula(ids: Iterable<string>): string | null {
  const unique = [
    ...new Set(
      [...ids]
        .map((id) => id.trim())
        .filter((id) => id.startsWith("rec")),
    ),
  ];
  if (unique.length === 0) {
    return null;
  }
  const clauses = unique.map(
    (id) => `RECORD_ID() = '${id.replace(/'/g, "\\'")}'`,
  );
  if (clauses.length === 1) {
    return clauses[0]!;
  }
  return `OR(${clauses.join(",")})`;
}
