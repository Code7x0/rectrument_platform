/**
 * One-time / idempotent backfill: copy Job ID from Comments [RP_JOBID] markers
 * into the Airtable Jobs "Job ID" field.
 *
 * Does NOT generate new Job IDs.
 * Does NOT overwrite an existing valid Job ID field value.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-job-ids-from-markers.mjs
 * Dry run:
 *   DRY_RUN=1 node --env-file=.env.local scripts/backfill-job-ids-from-markers.mjs
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
const JOB_ID_FIELD = "Job ID";
const COMMENTS_FIELD = "Comments";
/** Matches upsertJobIdMarker / parseJobIdMarker format. */
const JOB_ID_MARKER_RE = /\[RP_JOBID\]\s+([A-Z0-9]+_\d{3})\b/i;
const JOB_CODE_RE = /^[A-Z0-9]+_\d{3}$/;

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidJobCode(value) {
  return Boolean(value && JOB_CODE_RE.test(value.trim().toUpperCase()));
}

function parseJobIdMarker(comments) {
  if (!comments) return null;
  const m = JOB_ID_MARKER_RE.exec(comments);
  return m?.[1] ? m[1].toUpperCase() : null;
}

async function main() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const jobsTable = process.env.AIRTABLE_JOBS_TABLE || "Jobs";

  if (!apiKey || !baseId) {
    console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const table = base(jobsTable);

  let scanned = 0;
  let updated = 0;
  let skippedHasJobId = 0;
  let skippedNoMarker = 0;
  let skippedInvalid = 0;

  await table
    .select({ fields: [JOB_ID_FIELD, COMMENTS_FIELD] })
    .eachPage(async (records, fetchNextPage) => {
      for (const record of records) {
        scanned += 1;
        const existing = asString(record.get(JOB_ID_FIELD));
        if (isValidJobCode(existing)) {
          skippedHasJobId += 1;
          continue;
        }

        const fromMarker = parseJobIdMarker(asString(record.get(COMMENTS_FIELD)));
        if (!fromMarker) {
          skippedNoMarker += 1;
          continue;
        }
        if (!isValidJobCode(fromMarker)) {
          skippedInvalid += 1;
          continue;
        }

        if (DRY_RUN) {
          console.log(`[dry-run] ${record.id} → Job ID=${fromMarker}`);
          updated += 1;
          continue;
        }

        await table.update(record.id, { [JOB_ID_FIELD]: fromMarker });
        console.log(`updated ${record.id} → Job ID=${fromMarker}`);
        updated += 1;
      }
      fetchNextPage();
    });

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        scanned,
        updated,
        skippedHasJobId,
        skippedNoMarker,
        skippedInvalid,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
