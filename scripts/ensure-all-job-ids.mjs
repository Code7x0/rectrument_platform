/**
 * Idempotent backfill: ensure every Job has a valid business Job ID
 * (<ClientCode>_<###>) on the Jobs "Job ID" field and [RP_JOBID] Comments marker.
 *
 * Usage:
 *   node --env-file=.env.local scripts/ensure-all-job-ids.mjs
 * Dry run:
 *   DRY_RUN=1 node --env-file=.env.local scripts/ensure-all-job-ids.mjs
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
const JOB_CODE_RE = /^[A-Z0-9]+_\d{3}$/;
const JOB_ID_MARKER_PREFIX = "[RP_JOBID]";

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidJobCode(value) {
  return Boolean(value && JOB_CODE_RE.test(value.trim().toUpperCase()));
}

function parseJobIdMarker(comments) {
  if (!comments) return null;
  const m = /\[RP_JOBID\]\s+([A-Z0-9]+_\d{3})\b/i.exec(comments);
  return m?.[1] ? m[1].toUpperCase() : null;
}

function upsertJobIdMarker(existing, jobCode) {
  const marker = `${JOB_ID_MARKER_PREFIX} ${jobCode}`;
  const lines = (existing ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !l.trim().startsWith(JOB_ID_MARKER_PREFIX));
  lines.unshift(marker);
  return lines.join("\n").trim();
}

function formatJobCode(clientCode, sequence) {
  return `${clientCode.trim().toUpperCase()}_${String(sequence).padStart(3, "0")}`;
}

function nextJobSequence(clientCode, existingJobCodes) {
  const prefix = `${clientCode.trim().toUpperCase()}_`;
  let max = 0;
  for (const raw of existingJobCodes) {
    const code = raw.trim().toUpperCase();
    if (!code.startsWith(prefix)) continue;
    const rest = code.slice(prefix.length);
    const match = /^(\d{3})(?:_|$)/.exec(rest) ?? /^(\d+)$/.exec(rest);
    if (!match?.[1]) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function resolveCodeForRow(row) {
  const field = asString(row.fields[JOB_ID_FIELD]);
  const marker = parseJobIdMarker(asString(row.fields[COMMENTS_FIELD]));
  if (isValidJobCode(field)) return field.toUpperCase();
  if (isValidJobCode(marker)) return marker;
  return null;
}

async function main() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const jobsTable = process.env.AIRTABLE_JOBS_TABLE || "Jobs";
  const clientsTable = process.env.AIRTABLE_CLIENTS_TABLE || "Clients";

  if (!apiKey || !baseId) {
    console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE ===");

  const clientRows = await base(clientsTable).select({ pageSize: 100 }).all();
  const clientCodeById = new Map();
  for (const row of clientRows) {
    const code = asString(row.fields["Client ID"]);
    if (code) {
      clientCodeById.set(row.id, code.trim().toUpperCase());
    }
  }

  const jobRows = await base(jobsTable)
    .select({ pageSize: 100, sort: [{ field: "Posted Date", direction: "asc" }] })
    .all();

  jobRows.sort((a, b) => {
    const da = asString(a.fields["Posted Date"]) ?? a._rawJson.createdTime;
    const db = asString(b.fields["Posted Date"]) ?? b._rawJson.createdTime;
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });

  const assignedToRecord = new Map();
  for (const row of jobRows) {
    const code = resolveCodeForRow(row);
    if (code) assignedToRecord.set(code, row.id);
  }

  const codesByClient = new Map();
  for (const row of jobRows) {
    const clientId = Array.isArray(row.fields.Client)
      ? row.fields.Client[0]
      : null;
    if (!clientId) continue;
    const code = resolveCodeForRow(row);
    if (!code) continue;
    if (!codesByClient.has(clientId)) codesByClient.set(clientId, []);
    codesByClient.get(clientId).push(code);
  }

  let updated = 0;
  let skipped = 0;
  let noClient = 0;
  const plan = [];

  for (const row of jobRows) {
    const title = asString(row.fields["Job Title"]) ?? "Untitled";
    const clientId = Array.isArray(row.fields.Client)
      ? row.fields.Client[0]
      : null;
    const comments = asString(row.fields[COMMENTS_FIELD]) ?? "";
    const field = asString(row.fields[JOB_ID_FIELD]);
    const marker = parseJobIdMarker(comments);

    let target = null;
    if (isValidJobCode(field)) {
      target = field.toUpperCase();
    } else if (isValidJobCode(marker)) {
      const owner = assignedToRecord.get(marker);
      if (!owner || owner === row.id) {
        target = marker;
      }
    }

    if (!target) {
      if (!clientId) {
        noClient += 1;
        console.warn(`skip ${row.id} (${title}) — no client link`);
        continue;
      }
      const clientCode = clientCodeById.get(clientId);
      if (!clientCode) {
        noClient += 1;
        console.warn(
          `skip ${row.id} (${title}) — client ${clientId} has no Client ID`,
        );
        continue;
      }
      const existing = codesByClient.get(clientId) ?? [];
      const seq = nextJobSequence(clientCode, existing);
      target = formatJobCode(clientCode, seq);
      existing.push(target);
      codesByClient.set(clientId, existing);
      assignedToRecord.set(target, row.id);
    }

    const nextComments = upsertJobIdMarker(comments, target);
    const needsField = !isValidJobCode(field) || field.toUpperCase() !== target;
    const needsMarker = marker !== target || !comments.includes(JOB_ID_MARKER_PREFIX);

    if (!needsField && !needsMarker) {
      skipped += 1;
      continue;
    }

    plan.push({
      id: row.id,
      title,
      from: field ?? marker ?? "(none)",
      to: target,
      needsField,
      needsMarker,
    });
  }

  for (const item of plan) {
    const row = jobRows.find((r) => r.id === item.id);
    const comments = asString(row.fields[COMMENTS_FIELD]) ?? "";
    const patch = {};
    if (item.needsField) patch[JOB_ID_FIELD] = item.to;
    if (item.needsMarker) patch[COMMENTS_FIELD] = upsertJobIdMarker(comments, item.to);

    console.log(
      `${DRY_RUN ? "[dry-run] " : ""}${item.id} "${item.title}": ${item.from} → ${item.to}`,
    );

    if (!DRY_RUN) {
      await base(jobsTable).update(item.id, patch);
    }
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        totalJobs: jobRows.length,
        updated,
        skippedAlreadyOk: skipped,
        skippedNoClient: noClient,
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
