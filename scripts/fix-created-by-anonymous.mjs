/**
 * Replace Sonu stamps in Candidates.Created By with Anonymous.
 * System createdBy cannot be edited, so this converts/replaces that column
 * with a text field and backfills every row to Anonymous.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-created-by-anonymous.mjs
 *   DRY_RUN=1 node --env-file=.env.local scripts/fix-created-by-anonymous.mjs
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
const CREATED_BY_FIELD = "fldkblHIJGD7oF4yC";

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

function createdByName(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && typeof value.name === "string") {
    return value.name.trim() || null;
  }
  return null;
}

async function ensureCreatedByText() {
  const tables = await meta(`/bases/${BASE_ID}/tables`);
  if (tables.status !== 200) {
    throw new Error(
      `Meta list tables failed ${tables.status}: ${JSON.stringify(tables.json).slice(0, 400)}`,
    );
  }
  const table = tables.json.tables?.find((row) => row.id === TABLE_ID);
  const field = table?.fields?.find((row) => row.id === CREATED_BY_FIELD);
  if (!field) {
    throw new Error("Created By field not found");
  }
  console.log(`Created By currently type=${field.type} name=${JSON.stringify(field.name)}`);

  if (field.type === "singleLineText" && field.name === "Created By") {
    return { mode: "already-text", writeField: "Created By" };
  }

  if (field.type === "singleLineText") {
    return { mode: "text-renamed", writeField: field.name };
  }

  if (DRY_RUN) {
    console.log(
      "DRY_RUN: would convert/replace Created By so Sonu rows can become Anonymous",
    );
    return { mode: "dry-run", writeField: "Created By" };
  }

  if (field.type === "createdBy") {
    const converted = await meta(
      `/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${CREATED_BY_FIELD}`,
      { method: "PATCH", body: { type: "singleLineText" } },
    );
    if (converted.status === 200) {
      console.log("Converted Created By createdBy → singleLineText");
      return { mode: "converted", writeField: converted.json.name ?? "Created By" };
    }
    console.warn(
      `Convert Created By type failed ${converted.status}: ${JSON.stringify(converted.json).slice(0, 400)}`,
    );

    const renamed = await meta(
      `/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${CREATED_BY_FIELD}`,
      {
        method: "PATCH",
        body: {
          name: "API Created By",
          description: "System API actor. Display value is Created By.",
        },
      },
    );
    if (renamed.status !== 200) {
      throw new Error(
        `Rename Created By failed ${renamed.status}: ${JSON.stringify(renamed.json).slice(0, 500)}. ` +
          "In Airtable: Candidates → Created By → Customize field type → Single line text, then re-run.",
      );
    }

    const created = await meta(
      `/bases/${BASE_ID}/tables/${TABLE_ID}/fields`,
      {
        method: "POST",
        body: {
          name: "Created By",
          type: "singleLineText",
          description: "Submit attribution. Always Anonymous for platform/API creates.",
        },
      },
    );
    if (created.status !== 200) {
      throw new Error(
        `Create Created By text field failed ${created.status}: ${JSON.stringify(created.json).slice(0, 500)}`,
      );
    }
    console.log("Renamed system field to API Created By and created text Created By");
    return { mode: "replaced", writeField: "Created By" };
  }

  throw new Error(`Unexpected Created By type: ${field.type}`);
}

async function main() {
  if (!API_KEY || !BASE_ID) {
    throw new Error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required");
  }
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE CREATED BY → ANONYMOUS ===");

  const schema = await ensureCreatedByText();
  const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
  const rows = await base("Candidates")
    .select({
      pageSize: 100,
      fields: ["Created By", "API Created By", "Candidate Name"],
    })
    .all();

  let updated = 0;
  let skipped = 0;
  let sonuSeen = 0;

  for (const row of rows) {
    const current =
      createdByName(row.fields["Created By"]) ??
      createdByName(row.fields["API Created By"]);
    if (/^sonu$/i.test(current ?? "")) {
      sonuSeen += 1;
    }
    if (current === "Anonymous" && row.fields["Created By"] === "Anonymous") {
      skipped += 1;
      continue;
    }
    console.log(
      `${row.id} ${createdByName(row.fields["Candidate Name"]) ?? "(unnamed)"}: ${current ?? "(empty)"} → Anonymous`,
    );
    if (!DRY_RUN) {
      await base("Candidates").update(row.id, {
        [schema.writeField]: "Anonymous",
      });
    }
    updated += 1;
  }

  console.log("\nSummary", {
    total: rows.length,
    sonuSeen,
    updated,
    skippedAlreadyAnonymous: skipped,
    schema,
    dryRun: DRY_RUN,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
