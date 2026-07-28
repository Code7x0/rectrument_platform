#!/usr/bin/env node
/**
 * Role identity smoke test — prints who each email becomes after login.
 * Run whenever testers get confused about roles.
 *
 *   pnpm test:roles
 *   node --env-file=.env.local scripts/verify-role-identity.mjs
 */
import Airtable from "airtable";

function parseList(raw) {
  return (raw || "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function amTableName() {
  const raw = (process.env.AIRTABLE_ACCOUNT_MANAGERS_TABLE || "").trim();
  if (!raw || raw === "Account") return "Account Managers";
  return raw.replace(/^"|"$/g, "");
}

function partnersTableName() {
  return (process.env.AIRTABLE_PARTNERS_TABLE || "Partners").replace(
    /^"|"$/g,
    "",
  );
}

function resolveElevated(email, sa, admin) {
  if (sa.includes(email)) return "super_admin";
  if (admin.includes(email)) return "admin";
  return null;
}

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
if (!apiKey || !baseId) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
  process.exit(1);
}

const sa = parseList(process.env.AIRTABLE_SUPER_ADMIN_EMAILS);
const admin = parseList(process.env.AIRTABLE_ADMIN_EMAILS);
const base = new Airtable({ apiKey }).base(baseId);

const amRows = await base(amTableName()).select({ pageSize: 100 }).all();
const partnerRows = await base(partnersTableName())
  .select({ pageSize: 100 })
  .all();

const amByEmail = new Map();
for (const row of amRows) {
  const em = String(row.fields.Email || "")
    .trim()
    .toLowerCase();
  if (em) {
    amByEmail.set(em, {
      id: row.id,
      name: row.fields.Name || "",
      status: row.fields.Status || "",
    });
  }
}

const partnerByEmail = new Map();
for (const row of partnerRows) {
  const official = String(row.fields["Official Email ID"] || "")
    .trim()
    .toLowerCase();
  const personal = String(row.fields["Personal Email"] || "")
    .trim()
    .toLowerCase();
  const meta = {
    id: row.id,
    name: row.fields["Contact Name"] || row.fields["Company Name"] || "",
    status: row.fields.Status || "",
  };
  if (official) partnerByEmail.set(official, meta);
  if (personal) partnerByEmail.set(personal, meta);
}

/** Extra emails to always print (UAT testers). */
const EXTRA = ["lucifer01x7@gmail.com"];

const emails = new Set([
  ...sa,
  ...admin,
  ...amByEmail.keys(),
  ...EXTRA.map((e) => e.toLowerCase()),
]);

const rows = [];
let hardFailures = 0;
let softWarnings = 0;

for (const email of [...emails].sort()) {
  const elevated = resolveElevated(email, sa, admin);
  const am = amByEmail.get(email);
  const partner = partnerByEmail.get(email);

  let role;
  let source;
  let warning = "";

  if (elevated) {
    role = elevated;
    source = "env allow-list (wins over Airtable)";
    if (am || partner) {
      warning =
        "Also has Airtable AM/Partner row — still signs in as elevated role";
      softWarnings += 1;
    }
  } else if (am) {
    role = "account_manager";
    source = `Account Managers (${am.status || "no status"})`;
    if (String(am.status).toLowerCase() === "not active") {
      warning = "Status is Not Active — login may be blocked";
      softWarnings += 1;
    }
  } else if (partner) {
    role = "partner";
    source = `Partners (${partner.status || "no status"})`;
  } else {
    role = "NONE";
    source = "not found";
    warning = "Cannot sign in until added to env or Airtable";
    if (EXTRA.includes(email)) hardFailures += 1;
  }

  const dashboard =
    role === "super_admin"
      ? "/super-admin"
      : role === "admin"
        ? "/admin"
        : role === "account_manager"
          ? "/account-manager"
          : role === "partner"
            ? "/partner"
            : "—";

  rows.push({ email, role, dashboard, source, warning });
}

console.log("\n=== ROLE IDENTITY MAP (do not confuse these) ===\n");
console.log(
  "Rule: Super Admin / Admin emails in .env ALWAYS win over Account Managers / Partners rows.\n",
);

for (const row of rows) {
  const flag = row.warning ? ` ⚠ ${row.warning}` : "";
  console.log(
    `${row.email}\n  → ${row.role} → ${row.dashboard}\n  source: ${row.source}${flag}\n`,
  );
}

const lucifer = rows.find((r) => r.email === "lucifer01x7@gmail.com");
if (!lucifer || lucifer.role !== "account_manager") {
  console.error(
    "FAIL: lucifer01x7@gmail.com must resolve as account_manager. Run:\n  pnpm am:upsert -- --email=lucifer01x7@gmail.com --name=\"Lucifer\"",
  );
  process.exit(1);
}

if (String(amByEmail.get("lucifer01x7@gmail.com")?.status || "").toLowerCase() === "not active") {
  console.error("FAIL: lucifer01x7@gmail.com is Not Active — set Status = Active in Airtable.");
  process.exit(1);
}

console.log("PASS: lucifer01x7@gmail.com → account_manager → /account-manager");
if (hardFailures > 0) {
  console.error(`\n${hardFailures} hard failure(s) — fix before UAT.`);
  process.exit(1);
}
if (softWarnings > 0) {
  console.log(
    `\n${softWarnings} soft warning(s) (inactive legacy AMs / dual identity). UAT can continue.\n`,
  );
} else {
  console.log("\nAll checked identities look consistent.\n");
}