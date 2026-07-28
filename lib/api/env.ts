/**
 * Environment helpers.
 * Strips surrounding quotes so values like `"Account Managers"` work
 * whether or not the loader keeps quote characters.
 */
function normalizeEnvValue(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getRequiredEnv(key: string): string {
  const value = normalizeEnvValue(process.env[key]);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getOptionalEnv(key: string): string | undefined {
  const value = normalizeEnvValue(process.env[key]);
  return value || undefined;
}
