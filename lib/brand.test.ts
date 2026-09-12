import assert from "node:assert/strict";
import test from "node:test";

import { BRAND_LOGO_PATH } from "@/lib/constants";
import { CANONICAL_EMAIL_ORIGIN, getBrandLogoUrl } from "@/lib/brand";

test("getBrandLogoUrl uses canonical production host by default", () => {
  const prevLogo = process.env.EMAIL_BRAND_LOGO_URL;
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.EMAIL_BRAND_LOGO_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  assert.equal(
    getBrandLogoUrl(),
    `${CANONICAL_EMAIL_ORIGIN}${BRAND_LOGO_PATH}`,
  );
  assert.doesNotMatch(getBrandLogoUrl(), /localhost/);

  if (prevLogo) {
    process.env.EMAIL_BRAND_LOGO_URL = prevLogo;
  } else {
    delete process.env.EMAIL_BRAND_LOGO_URL;
  }
  if (prevApp) {
    process.env.NEXT_PUBLIC_APP_URL = prevApp;
  } else {
    delete process.env.NEXT_PUBLIC_APP_URL;
  }
});

test("getBrandLogoUrl respects EMAIL_BRAND_LOGO_URL override", () => {
  const prev = process.env.EMAIL_BRAND_LOGO_URL;
  process.env.EMAIL_BRAND_LOGO_URL = "https://cdn.example.com/logo.png";
  assert.equal(getBrandLogoUrl(), "https://cdn.example.com/logo.png");
  if (prev) {
    process.env.EMAIL_BRAND_LOGO_URL = prev;
  } else {
    delete process.env.EMAIL_BRAND_LOGO_URL;
  }
});
