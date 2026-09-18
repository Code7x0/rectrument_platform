/** Single-line table cells so registration emails stay tabular in HTML. */
export function flattenRegistrationEmailCell(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }
  if (Array.isArray(value)) {
    return value
      .map((part) => String(part).trim())
      .filter(Boolean)
      .join(", ");
  }
  return String(value)
    .replace(/[\r\n]+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 280);
}
