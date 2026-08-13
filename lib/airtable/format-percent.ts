/**
 * Format Airtable percent field values for display.
 * Airtable stores percent columns as fractions (0.02 === 2%).
 */

export function formatAirtablePercent(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatPercentPoints(value * 100);
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  if (!text) {
    return null;
  }

  if (/%\s*$/.test(text)) {
    return text.replace(/\s+%/g, "%");
  }

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) {
    return text;
  }

  // Bare decimals ≤ 1 are treated as Airtable fractions; larger values as points.
  const points = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return formatPercentPoints(points);
}

function formatPercentPoints(points: number): string {
  const rounded = Math.round(points * 100) / 100;
  return `${parseFloat(rounded.toFixed(2))}%`;
}
