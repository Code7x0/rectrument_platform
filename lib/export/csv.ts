/**
 * Lightweight CSV builder for browser downloads (Excel-compatible UTF-8).
 */

const UTF8_BOM = "\uFEFF";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatCsvCell(
  value: string | number | null | undefined,
): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value).trim();
}

export function buildCsvContent(
  headers: string[],
  rows: string[][],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return UTF8_BOM + lines.join("\r\n");
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function csvFilename(prefix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = prefix.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  return `${safe || "candidates"}_${stamp}.csv`;
}
