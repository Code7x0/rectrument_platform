import { getBrandLogoUrl } from "@/lib/brand";
import { APP_NAME_SHORT, APP_TAGLINE } from "@/lib/constants";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmailLine(line: string): string | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return '<div style="height:8px;line-height:8px;font-size:8px;">&nbsp;</div>';
  }

  if (trimmed === OVATO_DIVIDER || trimmed === OVATO_SIGNATURE) {
    return null;
  }

  if (trimmed.startsWith("Open dashboard: ")) {
    const url = trimmed.slice("Open dashboard: ".length).trim();
    return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;"><a href="${escapeHtml(url)}" style="color:#0f766e;font-weight:600;text-decoration:none;">Open dashboard</a></p>`;
  }

  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;">${escapeHtml(line)}</p>`;
}

/** Branded HTML wrapper used by Resend — logo header + company-style body. */
export function renderOvatoEmailHtml(text: string): string {
  const logoUrl = escapeHtml(getBrandLogoUrl());
  const bodyHtml = text
    .split("\n")
    .map(renderEmailLine)
    .filter((line): line is string => line !== null)
    .join("");

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;border-bottom:1px solid #f1f5f9;">
              <img src="${logoUrl}" alt="${APP_NAME_SHORT}.ai ${APP_TAGLINE}" width="148" style="display:block;max-width:148px;height:auto;border:0;" />
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
