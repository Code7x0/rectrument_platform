import { getBrandLogoUrl } from "@/lib/brand";
import { APP_BRAND_MARK, APP_NAME_SHORT } from "@/lib/constants";

/**
 * OVATO transactional email structure (per AM/Partner/Admin comms guide).
 */

export const OVATO_SIGNATURE = "OVATO.ai by Talent Socio";
export const OVATO_DIVIDER =
  "-------------------------------------------------------------------";

const IST_OFFSET_MINUTES = 330;

export function formatOvatoDate(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  const day = String(ist.getUTCDate()).padStart(2, "0");
  const month = ist
    .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
    .replace(".", "");
  const year = String(ist.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

/** Daily digest capture window: previous 24h ending at send time (7 AM IST cron). */
export function getDigestWindow(now = new Date()): { start: Date; end: Date } {
  const end = now;
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
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
  const pad = (value: string, width: number) => {
    if (value.length <= width) {
      return value.padEnd(width, " ");
    }
    return value;
  };

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

const TABLE_STYLE =
  "border-collapse:collapse;width:100%;margin:14px 0 18px;font-size:14px;line-height:1.45;";
const TH_STYLE =
  "text-align:left;padding:9px 10px;border:1px solid #dbe3ee;background:#f8fafc;font-weight:600;color:#0f172a;";
const TD_STYLE =
  "padding:9px 10px;border:1px solid #e2e8f0;color:#334155;vertical-align:top;";

export function formatHtmlTable(
  headers: string[],
  rows: string[][],
): string {
  if (rows.length === 0) {
    return "";
  }

  const head = headers
    .map((header) => `<th style="${TH_STYLE}">${escapeHtml(header)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="${TD_STYLE}">${escapeHtml(cell ?? "")}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="${TABLE_STYLE}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitColumns(line: string): string[] {
  if (line.includes("|")) {
    return line
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  if (/\s{2,}/.test(line)) {
    return line
      .split(/\s{2,}/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  return [];
}

function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("Open dashboard:")) {
    return false;
  }

  return (
    trimmed.endsWith(":") ||
    /^[A-Z][A-Z0-9 /()+-]+$/.test(trimmed) ||
    trimmed.startsWith("Client Name:") ||
    trimmed === "SLA alert" ||
    trimmed === "Job Changes" ||
    trimmed === "Candidate Updates:" ||
    trimmed === "Profiles Recommended:" ||
    trimmed.startsWith("New Accounts Activated") ||
    trimmed.startsWith("New Roles Activated")
  );
}

function renderHeading(line: string): string {
  return `<h3 style="margin:18px 0 8px;font-size:15px;line-height:1.4;font-weight:700;color:#0f172a;">${escapeHtml(line.trim())}</h3>`;
}

function renderParagraph(line: string): string {
  const trimmed = line.trim();
  const metricMatch = /^([^:]+):\s*(.+)$/.exec(trimmed);
  if (metricMatch && !trimmed.startsWith("http")) {
    return `<p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#0f172a;"><strong>${escapeHtml(metricMatch[1]!.trim())}:</strong> ${escapeHtml(metricMatch[2]!.trim())}</p>`;
  }

  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;">${escapeHtml(line)}</p>`;
}

function tryParseTableBlock(lines: string[], start: number): { html: string; next: number } | null {
  const first = lines[start]?.trim();
  if (!first) {
    return null;
  }

  const firstCols = splitColumns(first);
  if (firstCols.length < 2) {
    return null;
  }

  const tableLines = [first];
  let index = start + 1;
  while (index < lines.length) {
    const candidate = lines[index]?.trim();
    if (!candidate) {
      break;
    }
    const cols = splitColumns(candidate);
    if (cols.length !== firstCols.length) {
      break;
    }
    tableLines.push(candidate);
    index += 1;
  }

  if (tableLines.length < 2) {
    return null;
  }

  const headers = splitColumns(tableLines[0]!);
  const rows = tableLines.slice(1).map((line) => splitColumns(line));
  return {
    html: formatHtmlTable(headers, rows),
    next: index,
  };
}

/** Convert plain-text OVATO email bodies into HTML with real tables. */
export function convertPlainEmailToHtml(text: string): string {
  const lines = text.split("\n");
  const parts: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === OVATO_DIVIDER || trimmed === OVATO_SIGNATURE) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("Open dashboard: ")) {
      const url = trimmed.slice("Open dashboard: ".length).trim();
      parts.push(
        `<p style="margin:16px 0 0;font-size:15px;line-height:1.55;"><a href="${escapeHtml(url)}" style="color:#0f766e;font-weight:600;text-decoration:none;">Open dashboard</a></p>`,
      );
      index += 1;
      continue;
    }

    const table = tryParseTableBlock(lines, index);
    if (table) {
      parts.push(table.html);
      index = table.next;
      continue;
    }

    if (isSectionHeading(trimmed)) {
      parts.push(renderHeading(trimmed));
      index += 1;
      continue;
    }

    parts.push(renderParagraph(line));
    index += 1;
  }

  return parts.join("");
}

/** Branded HTML wrapper used by Resend — logo header + company-style body. */
export function renderOvatoEmailHtml(text: string): string {
  const logoUrl = escapeHtml(getBrandLogoUrl());
  const bodyHtml = convertPlainEmailToHtml(text);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME_SHORT}.ai</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px 12px;border-bottom:1px solid #f1f5f9;">
              <img src="${logoUrl}" alt="${APP_BRAND_MARK}" width="220" style="display:block;max-width:220px;width:100%;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">${OVATO_SIGNATURE}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
