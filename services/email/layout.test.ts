import assert from "node:assert/strict";
import test from "node:test";

import {
  convertPlainEmailToHtml,
  formatTable,
  renderOvatoEmailHtml,
} from "./layout";

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
  process.env.EMAIL_BRAND_LOGO_URL = "https://www.ovato.ai/brand/ovato-logo.png";
  const html = renderOvatoEmailHtml("Hey\n\nTest body.");
  assert.match(html, /https:\/\/www\.ovato\.ai\/brand\/ovato-logo\.png/);
  assert.match(html, /OVATO\.ai by Talent Socio/);
  delete process.env.EMAIL_BRAND_LOGO_URL;
});
