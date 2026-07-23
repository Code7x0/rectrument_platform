# Airtable — Platform Settings

## Table

Env: `AIRTABLE_SETTINGS_TABLE`

Singleton document for Feature 16. One row with `Settings Key = platform`.

## Fields

| Airtable field | Notes |
|----------------|-------|
| Settings Key | text — value `platform` |
| Payload | long text — JSON of company/users/recruitment/payouts/notifications |
| Updated At | date/time |
| Updated By | link → Users (optional) |

## Notes

- Soft defaults apply when the env var / table is missing
- Saves fail until the table is configured
- Do not store secrets (API keys, Clerk secret) in Payload
