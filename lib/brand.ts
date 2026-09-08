import { BRAND_LOGO_PATH } from "@/lib/constants";

export function getBrandLogoUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "https://www.ovato.ai";

  return `${base}${BRAND_LOGO_PATH}`;
}
