import assert from "node:assert/strict";
import test from "node:test";

import { makeJpegFixture, makePdfFixture, makePngFixture } from "./preview-fixtures";
import { resolveClientPreview } from "./resolve-client-preview";

test("extensionless filenames never gate client preview", () => {
  const cases = [
    { bytes: new Uint8Array(makePdfFixture()), status: "pdf" },
    { bytes: new Uint8Array(makePngFixture()), status: "image" },
    { bytes: new Uint8Array(makeJpegFixture()), status: "image" },
  ] as const;

  for (const item of cases) {
    const preview = resolveClientPreview({
      headerKind: null,
      contentType: "application/octet-stream",
      bytes: item.bytes,
    });
    assert.equal(preview.status, item.status);
  }
});

test("html from server conversion previews as html", () => {
  const preview = resolveClientPreview({
    headerKind: "docx",
    contentType: "text/html; charset=utf-8",
    bytes: new TextEncoder().encode("<p>Word body</p>"),
  });
  assert.equal(preview.status, "html");
  if (preview.status === "html") {
    assert.match(preview.html, /Word body/);
  }
});
