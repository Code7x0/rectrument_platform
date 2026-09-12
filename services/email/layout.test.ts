import assert from "node:assert/strict";
import test from "node:test";

import {
  convertPlainEmailToHtml,
  formatDigestDayHeading,
  formatTable,
  renderOvatoEmailHtml,
} from "./layout";

test("formatDigestDayHeading uses ordinal day labels", () => {
  const label = formatDigestDayHeading(new Date("2026-09-12T00:00:00.000Z"));
  assert.match(label, /12th September 2026/);
});

test("formatTable uses double-space columns for HTML parsing", () => {
  const table = formatTable(
    ["Designation", "Count"],
    [["Senior Developer", "3"]],
  );
  assert.match(table, /Designation\s{2,}Count/);
});

test("convertPlainEmailToHtml renders real HTML tables", () => {
  const text = [
    "Profiles Recommended:",
    formatTable(
      ["Designation", "Count"],
      [["Senior Developer", "2"], ["Product Manager", "1"]],
    ),
  ].join("\n");

  const html = convertPlainEmailToHtml(text);
  assert.match(html, /<table[^>]*>/);
  assert.match(html, /<th[^>]*>Designation<\/th>/);
  assert.match(html, /<td[^>]*>Senior Developer<\/td>/);
});

test("renderOvatoEmailHtml includes branded logo header", () => {
  const prevLogo = process.env.EMAIL_BRAND_LOGO_URL;
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.EMAIL_BRAND_LOGO_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  const html = renderOvatoEmailHtml("Hey\n\nTest body.");
  assert.match(html, /https:\/\/www\.ovato\.ai\/brand\/ovato-logo\.png/);
  assert.doesNotMatch(html, /localhost/);
  assert.match(html, /OVATO\.ai by Talent Socio/);

  if (prevLogo) {
    process.env.EMAIL_BRAND_LOGO_URL = prevLogo;
  }
  if (prevApp) {
    process.env.NEXT_PUBLIC_APP_URL = prevApp;
  } else {
    delete process.env.NEXT_PUBLIC_APP_URL;
  }
});
