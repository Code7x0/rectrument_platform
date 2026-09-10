import { BRAND_LOGO_PATH } from "@/lib/constants";

/**
 * Absolute logo URL for transactional email HTML.
 * Prefer EMAIL_BRAND_LOGO_URL, then the canonical OVATO domain so Vercel
 * preview URLs do not break images in inboxes.
 */
export function getBrandLogoUrl(): string {
  const explicit = process.env.EMAIL_BRAND_LOGO_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const appUrl = (
    process.env.EMAIL_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    ""
  ).replace(/\/$/, "");

  const base =
    appUrl && appUrl.includes("ovato.ai")
      ? appUrl
      : appUrl && !appUrl.includes("vercel.app")
        ? appUrl
        : "https://www.ovato.ai";

  return `${base}${BRAND_LOGO_PATH}`;
}
