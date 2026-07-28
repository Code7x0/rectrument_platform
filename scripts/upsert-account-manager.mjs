#!/usr/bin/env node
/**
 * Upsert an Account Manager row in Airtable (locked schema).
 *
 * Usage:
 *   node --env-file=.env.local scripts/upsert-account-manager.mjs \
 *     --email=you@example.com --name="Your Name"
 *
 * Then sign up / sign in with that email in Clerk → lands on /account-manager.
 */
import Airtable from "airtable";

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function amTableName() {
  const raw = (process.env.AIRTABLE_ACCOUNT_MANAGERS_TABLE || "").trim();
  if (!raw || raw === "Account" || raw === '"Account') {
    return "Account Managers";
  }
  return raw.replace(/^"|"$/g, "");
}

const email = arg("email").trim().toLowerCase();
const name = arg("name", "Account Manager").trim() || "Account Manager";

if (!email || !email.includes("@")) {
  console.error("Usage: --email=you@example.com [--name=\"Full Name\"]");
  process.exit(1);
}

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
if (!apiKey || !baseId) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
  process.exit(1);
}

const table = amTableName();
const base = new Airtable({ apiKey }).base(baseId);

const existing = await base(table)
  .select({
    filterByFormula: `LOWER({Email}) = '${email.replace(/'/g, "\\'")}'`,
    maxRecords: 1,
  })
  .firstPage();

if (existing[0]) {
  const id = existing[0].id;
  await base(table).update(id, {
    Name: name,
    Status: "Active",
    Email: email,
  });
  console.log(
    JSON.stringify(
      {
        action: "updated",
        id,
        email,
        name,
        role: "account_manager",
        loginHint: "Sign in with Clerk using this email → /account-manager",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const created = await base(table).create({
  Name: name,
  Email: email,
  Status: "Active",
});

console.log(
  JSON.stringify(
    {
      action: "created",
      id: created.id,
      email,
      name,
      role: "account_manager",
      loginHint: "Create a Clerk account with this exact email, then sign in → /account-manager",
    },
    null,
    2,
  ),
);
