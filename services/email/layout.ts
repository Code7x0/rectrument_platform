/**
 * OVATO transactional email structure (per AM/Partner/Admin comms guide).
 */

export const OVATO_SIGNATURE = "OVATO.ai by Talent Socio";
export const OVATO_DIVIDER =
  "-------------------------------------------------------------------";

export function formatOvatoDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date
    .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
    .replace(".", "");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export function formatOvatoSubject(parts: string[]): string {
  return ["Ovato.AI", ...parts.filter(Boolean)].join(" · ");
}

export function formatOvatoEmailBody(input: {
  greeting?: string;
  intro?: string;
  sections: string[];
  dashboardUrl?: string | null;
  closing?: string;
}): string {
  const lines: string[] = [
    input.greeting ?? "Hey",
    "",
    input.intro ?? "",
    ...input.sections.filter((section) => section.trim().length > 0),
  ];

  if (input.closing?.trim()) {
    lines.push("", input.closing.trim());
  }

  if (input.dashboardUrl?.trim()) {
    lines.push("", `Open dashboard: ${input.dashboardUrl.trim()}`);
  }

  lines.push("", OVATO_DIVIDER, "", OVATO_SIGNATURE);
  return lines.filter((line, index, all) => {
    if (line !== "") {
      return true;
    }
    return index > 0 && all[index - 1] !== "";
  }).join("\n");
}

export function formatCountLine(label: string, count: number): string {
  return `${label}: ${count}`;
}

export function formatTable(
  headers: string[],
  rows: string[][],
): string {
  if (rows.length === 0) {
    return "";
  }
  const colWidths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => (row[index] ?? "").length),
    ),
  );
  const pad = (value: string, width: number) =>
    value.padEnd(width, " ").slice(0, width);

  const headerLine = headers
    .map((header, index) => pad(header, colWidths[index]!))
    .join("  ");
  const body = rows
    .map((row) =>
      row.map((cell, index) => pad(cell ?? "", colWidths[index]!)).join("  "),
    )
    .join("\n");

  return `${headerLine}\n${body}`;
}
