/**
 * Convert Candidates.Candidate ID from autoNumber → partner-style codes (YB_451)
 * and backfill every live row. Does not touch Created By.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-candidate-ids.mjs
 *   DRY_RUN=1 node --env-file=.env.local scripts/migrate-candidate-ids.mjs
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
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;
const TABLE_ID = "tblLqvfHjSkJHCogB";
const CANDIDATE_ID_FIELD = "fldj78uyeQ2Wnf9sd";
const CANDIDATE_CODE_RE = /^[A-Z]{2}_\d{3}(?:_\d+)?$/;

function asString(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidCandidateCode(value) {
  return Boolean(value && CANDIDATE_CODE_RE.test(value.trim().toUpperCase()));
}

function buildCandidateCodeBase(fullName, phone) {
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

async function meta(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.airtable.com/v0/meta${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function ensureCandidateIdIsText() {
  const tables = await meta(`/bases/${BASE_ID}/tables`);
  if (tables.status !== 200) {
    throw new Error(`Meta list tables failed ${tables.status}: ${JSON.stringify(tables.json).slice(0, 400)}`);
  }
  const table = tables.json.tables?.find((row) => row.id === TABLE_ID);
  const field = table?.fields?.find((row) => row.id === CANDIDATE_ID_FIELD);
  if (!field) {
    throw new Error("Candidate ID field not found");
  }
  console.log(`Candidate ID currently type=${field.type} name=${JSON.stringify(field.name)}`);
  if (field.type === "singleLineText") {
    return { converted: false, name: field.name };
  }
  if (field.type !== "autoNumber") {
    throw new Error(`Unexpected Candidate ID type: ${field.type}`);
  }
  if (DRY_RUN) {
    console.log("DRY_RUN: would convert Candidate ID autoNumber → singleLineText");
    return { converted: false, name: field.name, dryRunWouldConvert: true };
  }
  const patched = await meta(
    `/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${CANDIDATE_ID_FIELD}`,
    { method: "PATCH", body: { type: "singleLineText" } },
  );
  if (patched.status !== 200) {
    throw new Error(
      `Convert Candidate ID failed ${patched.status}: ${JSON.stringify(patched.json).slice(0, 600)}. ` +
        "A base creator must change Candidates → Candidate ID from Autonumber to Single line text, then re-run this script. Created By must stay as the system createdBy field.",
    );
  }
  console.log("Converted Candidate ID to singleLineText");
  return { converted: true, name: patched.json.name ?? field.name };
}

async function main() {
  if (!API_KEY || !BASE_ID) {
    throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required");
  }
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE CANDIDATE ID MIGRATION ===");

  const schema = await ensureCandidateIdIsText();
  const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  const rows = await base("Candidates")
    .select({
      pageSize: 100,
      fields: ["Candidate ID", "Candidate Name", "Phone Number"],
    })
    .all();

  const taken = new Set();
  for (const row of rows) {
    const code = asString(row.fields["Candidate ID"]);
    if (isValidCandidateCode(code)) {
      taken.add(code.toUpperCase());
    }
  }

  let updated = 0;
  let skipped = 0;
  const updates = [];
  for (const row of rows) {
    const current = asString(row.fields["Candidate ID"]);
    if (isValidCandidateCode(current)) {
      skipped += 1;
      continue;
    }
    const next = allocateUnique(
      buildCandidateCodeBase(
        asString(row.fields["Candidate Name"]),
        asString(row.fields["Phone Number"]),
      ),
      taken,
    );
    taken.add(next);
    updates.push({ id: row.id, from: current, to: next, name: asString(row.fields["Candidate Name"]) });
  }

  for (const item of updates) {
    console.log(`${item.id} ${item.name ?? "(unnamed)"}: ${item.from ?? "(empty)"} → ${item.to}`);
    if (!DRY_RUN) {
      await base("Candidates").update(item.id, { "Candidate ID": item.to });
    }
    updated += 1;
  }

  console.log("\nSummary", {
    total: rows.length,
    updated,
    skippedValid: skipped,
    schema,
    dryRun: DRY_RUN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
