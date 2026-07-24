/**
 * One-time migration: assign business Partner Codes (if missing/invalid)
 * and Job IDs (<ClientCode>_<Sequence>) on the locked client Airtable.
 *
 * Does NOT change Client IDs or Airtable record IDs / relationships.
 *
 * Usage: node --env-file=.env.local scripts/migrate-business-ids.mjs
 * Dry run: DRY_RUN=1 node --env-file=.env.local scripts/migrate-business-ids.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import Airtable from "airtable";

function loadEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] ??= val;
    }
  } catch {
    // rely on process env
  }
}

loadEnv();

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const PARTNER_CODE_RE = /^[A-Z]{2}_\d{3}(?:_\d+)?$/;
const JOB_ID_MARKER = "[RP_JOBID]";

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidPartnerCode(value) {
  return Boolean(value && PARTNER_CODE_RE.test(value.trim().toUpperCase()));
}

function buildPartnerCodeBase(fullName, phone) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = (parts[0]?.[0] ?? "X").toUpperCase();
  const last = (
    parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "X")
  ).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  const last3 = (digits.slice(-3) || "000").padStart(3, "0");
  return `${first}${last}_${last3}`;
}

function allocateUnique(base, taken) {
  const normalized = base.toUpperCase();
  if (!taken.has(normalized)) return normalized;
  let n = 2;
  while (taken.has(`${normalized}_${n}`)) n += 1;
  return `${normalized}_${n}`;
}

function parseJobIdMarker(comments) {
  if (!comments) return null;
  const m = /\[RP_JOBID\]\s+([A-Z0-9]+_\d{3})\b/i.exec(comments);
  return m?.[1] ? m[1].toUpperCase() : null;
}

function upsertJobIdMarker(existing, jobCode) {
  const marker = `${JOB_ID_MARKER} ${jobCode}`;
  const lines = (existing ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !l.trim().startsWith(JOB_ID_MARKER));
  lines.unshift(marker);
  return lines.join("\n").trim();
}

function formatJobCode(clientCode, sequence) {
  return `${clientCode}_${String(sequence).padStart(3, "0")}`;
}

async function main() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required");
  }

  const base = new Airtable({ apiKey }).base(baseId);
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE MIGRATION ===");

  // --- Partners ---
  const partnerRows = await base("Partners").select({ pageSize: 100 }).all();
  const takenCodes = new Set();
  for (const row of partnerRows) {
    const code = asString(row.fields["Partner Code"]);
    if (isValidPartnerCode(code)) {
      takenCodes.add(code.toUpperCase());
    }
  }

  let partnersUpdated = 0;
  let partnersSkipped = 0;
  for (const row of partnerRows) {
    const current = asString(row.fields["Partner Code"]);
    if (isValidPartnerCode(current)) {
      partnersSkipped += 1;
      continue;
    }
    const name =
      asString(row.fields["Contact Name"]) ||
      asString(row.fields["Company Name"]) ||
      "XX";
    const phone = asString(row.fields["Phone Number"]);
    const next = allocateUnique(buildPartnerCodeBase(name, phone), takenCodes);
    takenCodes.add(next);
    console.log(`Partner ${row.id}: ${current ?? "(empty)"} → ${next}`);
    if (!DRY_RUN) {
      await base("Partners").update(row.id, { "Partner Code": next });
    }
    partnersUpdated += 1;
  }

  // --- Clients map ---
  const clientRows = await base("Clients").select({ pageSize: 100 }).all();
  const clientCodeById = new Map();
  for (const row of clientRows) {
    const code = asString(row.fields["Client ID"]);
    if (code) {
      clientCodeById.set(row.id, code.toUpperCase());
    }
  }

  // --- Jobs ---
  const jobRows = await base("Jobs")
    .select({
      pageSize: 100,
      sort: [{ field: "Posted Date", direction: "asc" }],
    })
    .all();

  // Group by client for sequencing; stable order by Posted Date then id
  const byClient = new Map();
  for (const row of jobRows) {
    const clientLink = row.fields.Client;
    const clientId = Array.isArray(clientLink) ? clientLink[0] : null;
    if (!clientId) continue;
    if (!byClient.has(clientId)) byClient.set(clientId, []);
    byClient.get(clientId).push(row);
  }

  let jobsUpdated = 0;
  let jobsSkipped = 0;
  let jobsNoClientCode = 0;

  for (const [clientId, jobs] of byClient) {
    const clientCode = clientCodeById.get(clientId);
    if (!clientCode) {
      jobsNoClientCode += jobs.length;
      console.warn(`No Client ID for client ${clientId} — skip ${jobs.length} jobs`);
      continue;
    }

    jobs.sort((a, b) => {
      const da = asString(a.fields["Posted Date"]) ?? "";
      const db = asString(b.fields["Posted Date"]) ?? "";
      if (da !== db) return da.localeCompare(db);
      return a.id.localeCompare(b.id);
    });

    let seq = 1;
    // Respect already-migrated codes for this client
    for (const row of jobs) {
      const existing = parseJobIdMarker(asString(row.fields.Comments));
      if (existing?.startsWith(`${clientCode}_`)) {
        const n = Number(existing.slice(clientCode.length + 1));
        if (Number.isFinite(n) && n >= seq) seq = n + 1;
      }
    }

    for (const row of jobs) {
      const existing = parseJobIdMarker(asString(row.fields.Comments));
      if (existing?.startsWith(`${clientCode}_`)) {
        jobsSkipped += 1;
        continue;
      }
      const jobCode = formatJobCode(clientCode, seq);
      seq += 1;
      const nextComments = upsertJobIdMarker(
        asString(row.fields.Comments),
        jobCode,
      );
      console.log(
        `Job ${row.id} (${asString(row.fields["Job Title"]) ?? "Untitled"}): → ${jobCode}`,
      );
      if (!DRY_RUN) {
        await base("Jobs").update(row.id, { Comments: nextComments });
      }
      jobsUpdated += 1;
    }
  }

  console.log("\nSummary");
  console.log({
    partnersUpdated,
    partnersSkippedValid: partnersSkipped,
    jobsUpdated,
    jobsSkippedValid: jobsSkipped,
    jobsNoClientCode,
    dryRun: DRY_RUN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
