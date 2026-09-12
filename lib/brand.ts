import { BRAND_LOGO_PATH } from "@/lib/constants";

/** Public origin for email image assets — must work from Gmail/Outlook inboxes. */
export const CANONICAL_EMAIL_ORIGIN = "https://www.ovato.ai";

/**
 * Absolute logo URL for transactional email HTML.
 * Email clients cannot load localhost or Vercel preview assets, so the logo
 * always points at the canonical production host unless EMAIL_BRAND_LOGO_URL
 * is set explicitly.
 */
export function getBrandLogoUrl(): string {
  const explicit = process.env.EMAIL_BRAND_LOGO_URL?.trim();
  if (explicit) {
    return explicit;
  }

  return `${CANONICAL_EMAIL_ORIGIN}${BRAND_LOGO_PATH}`;
}
