import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

import { buildProxiedFilePayload } from "./build-file-response";
import { convertDocxToHtml } from "./convert-word";
import {
  makeDocxFixture,
  makeJpegFixture,
  makeOleMagicFixture,
  makePdfFixture,
  makePngFixture,
} from "./preview-fixtures";
import { resolveClientPreview } from "./resolve-client-preview";
import { sniffFileKind } from "./sniff-file";

const EXTENSIONLESS_NAMES = ["document", "Nagarjun G resume"];

async function assertPreview(
  buffer: Buffer,
  expected: { kind: string; contentTypePrefix: string; htmlIncludes?: string },
) {
  for (const filename of EXTENSIONLESS_NAMES) {
    const payload = await buildProxiedFilePayload({
      buffer,
      filename,
      download: false,
    });
    assert.equal(payload.kind, expected.kind, `${filename} kind`);
    assert.ok(
      payload.contentType.startsWith(expected.contentTypePrefix),
      `${filename} content-type ${payload.contentType}`,
    );
    if (expected.htmlIncludes) {
      assert.equal(typeof payload.body, "string");
      assert.match(String(payload.body), new RegExp(expected.htmlIncludes));
    } else {
      assert.ok(Buffer.isBuffer(payload.body));
    }

    const bytes =
      typeof payload.body === "string"
        ? new TextEncoder().encode(payload.body)
        : new Uint8Array(payload.body);
    const client = resolveClientPreview({
      headerKind: payload.kind,
      contentType: payload.contentType,
      bytes,
    });
    if (expected.kind === "pdf") {
      assert.equal(client.status, "pdf");
    } else if (expected.kind === "png" || expected.kind === "jpeg") {
      assert.equal(client.status, "image");
    } else {
      assert.equal(client.status, "html");
    }
  }
}

test("sniffs pdf/png/jpeg/docx/ole without filenames", () => {
  assert.equal(sniffFileKind(new Uint8Array(makePdfFixture())), "pdf");
  assert.equal(sniffFileKind(new Uint8Array(makePngFixture())), "png");
  assert.equal(sniffFileKind(new Uint8Array(makeJpegFixture())), "jpeg");
  assert.equal(sniffFileKind(new Uint8Array(makeDocxFixture())), "docx");
  assert.equal(sniffFileKind(new Uint8Array(makeOleMagicFixture())), "doc");
});

test("buildProxiedFilePayload previews pdf/png/jpeg/docx with extensionless names", async () => {
  await assertPreview(makePdfFixture(), {
    kind: "pdf",
    contentTypePrefix: "application/pdf",
  });
  await assertPreview(makePngFixture(), {
    kind: "png",
    contentTypePrefix: "image/png",
  });
  await assertPreview(makeJpegFixture(), {
    kind: "jpeg",
    contentTypePrefix: "image/jpeg",
  });
  await assertPreview(makeDocxFixture(), {
    kind: "docx",
    contentTypePrefix: "text/html",
    htmlIncludes: "Preview DOCX OK",
  });
});

test("docx conversion uses mammoth buffer option", async () => {
  const html = await convertDocxToHtml(makeDocxFixture("Mammoth buffer works"));
  assert.ok(html);
  assert.match(html, /Mammoth buffer works/);
});

test("ole .doc magic routes to word-extractor without crashing", async () => {
  const payload = await buildProxiedFilePayload({
    buffer: makeOleMagicFixture(),
    filename: "Nagarjun G resume",
    download: false,
  });
  assert.equal(payload.kind, "doc");
  assert.equal(payload.contentType, "application/msword");
});

test("real Nagarjun Airtable resume sniffs as pdf and previews", async (t) => {
  const path = "/tmp/nagarjun-resume.bin";
  if (!existsSync(path)) {
    t.skip("Nagarjun resume bytes were not downloaded");
    return;
  }
  const buffer = readFileSync(path);
  const magic = buffer.subarray(0, 8);
  assert.equal(Buffer.from(magic.subarray(0, 4)).toString(), "%PDF");
  assert.equal(sniffFileKind(new Uint8Array(buffer)), "pdf");
  await assertPreview(buffer, {
    kind: "pdf",
    contentTypePrefix: "application/pdf",
  });
});

test("client preview ignores extensionless filenames", () => {
  const pdf = new Uint8Array(makePdfFixture());
  const preview = resolveClientPreview({
    headerKind: null,
    contentType: "application/octet-stream",
    bytes: pdf,
  });
  assert.equal(preview.status, "pdf");
});
