/**
 * Live backfill — ONLY these two Candidates columns:
 *   - Candidate ID  → 5826_sk42 format
 *   - Created By    → Anonymous when current value is Sonu
 *
 * Does not read or write Screening Matrix, Internal Feedback, or any other field.
 *
 *   DRY_RUN=1 node --env-file=.env.local scripts/backfill-candidate-id-created-by.mjs
 *   node --env-file=.env.local scripts/backfill-candidate-id-created-by.mjs
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
const CANDIDATE_CODE_RE = /^\d{4,6}_[a-z]{2}\d{2}(?:_\d+)?$/;

function asString(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function createdByName(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && typeof value.name === "string") {
    return value.name.trim() || null;
  }
  return null;
}

function isSonu(value) {
  return /^sonu$/i.test(value ?? "");
}

function isValidCandidateCode(value) {
  return Boolean(value && CANDIDATE_CODE_RE.test(value.trim().toLowerCase()));
}

function formatStamp(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const day = String(Number(parts.find((part) => part.type === "day")?.value ?? "1"));
  const month = String(
    Number(parts.find((part) => part.type === "month")?.value ?? "1"),
  );
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  return `${day}${month}${year.slice(-2)}`;
}

function dateStampFrom(value) {
  if (!value) {
    return formatStamp(new Date());
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return formatStamp(new Date());
  }
  return formatStamp(parsed);
}

function buildCandidateCodeBase(fullName, phone, submittedAt) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = (parts[0]?.[0] ?? "x").toLowerCase();
  const last = (
    parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "x")
  ).toLowerCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  const last2 = (digits.slice(-2) || "00").padStart(2, "0");
  return `${dateStampFrom(submittedAt)}_${first}${last}${last2}`;
}

function allocateUnique(base, taken) {
  const seed = base.toLowerCase();
  if (!taken.has(seed)) return seed;
  let n = 2;
  while (taken.has(`${seed}_${n}`)) n += 1;
  return `${seed}_${n}`;
}

async function main() {
  if (!API_KEY || !BASE_ID) {
    throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required");
  }
  console.log(
    DRY_RUN
      ? "=== DRY RUN candidate id + sonu→anonymous ==="
      : "=== LIVE candidate id + sonu→anonymous ===",
  );

  const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  const rows = await base("Candidates")
    .select({
      pageSize: 100,
      fields: [
        "Candidate ID",
        "Created By",
        "Candidate Name",
        "Phone Number",
        "Submission Date",
      ],
    })
    .all();

  const taken = new Set();
  const planned = [];

  for (const row of rows) {
    const nextId = allocateUnique(
      buildCandidateCodeBase(
        asString(row.fields["Candidate Name"]),
        asString(row.fields["Phone Number"]),
        asString(row.fields["Submission Date"]),
      ),
      taken,
    );
    taken.add(nextId);

    const currentId = asString(row.fields["Candidate ID"]);
    const currentCreatedBy = createdByName(row.fields["Created By"]);
    const fields = {};
    if (!currentId || currentId.toLowerCase() !== nextId) {
      fields["Candidate ID"] = nextId;
    }
    if (isSonu(currentCreatedBy)) {
      fields["Created By"] = "Anonymous";
    }

    planned.push({
      id: row.id,
      name: asString(row.fields["Candidate Name"]),
      fromId: currentId,
      toId: nextId,
      fromCreatedBy: currentCreatedBy,
      fields,
    });
  }

  let idUpdates = 0;
  let createdByUpdates = 0;
  let unchanged = 0;

  for (const item of planned) {
    const keys = Object.keys(item.fields);
    if (keys.length === 0) {
      unchanged += 1;
      continue;
    }
    if (item.fields["Candidate ID"]) {
      idUpdates += 1;
      console.log(
        `${item.id} ${item.name ?? "(unnamed)"} ID ${item.fromId ?? "(empty)"} → ${item.toId}`,
      );
    }
    if (item.fields["Created By"]) {
      createdByUpdates += 1;
      console.log(
        `${item.id} ${item.name ?? "(unnamed)"} Created By ${item.fromCreatedBy} → Anonymous`,
      );
    }
    if (!DRY_RUN) {
      await base("Candidates").update(item.id, item.fields);
    }
  }

  console.log("\nSummary", {
    total: rows.length,
    idUpdates,
    sonuToAnonymous: createdByUpdates,
    unchanged,
    alreadyValidIds: planned.filter((item) => isValidCandidateCode(item.fromId))
      .length,
    dryRun: DRY_RUN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
