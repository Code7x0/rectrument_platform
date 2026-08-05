function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function textToPreviewHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
}

export async function convertDocxToHtml(buffer: Buffer): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    return result.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function convertDocToHtml(buffer: Buffer): Promise<string | null> {
  try {
    const { default: WordExtractor } = await import("word-extractor");
    const extracted = await new WordExtractor().extract(buffer);
    const body = extracted.getBody()?.trim();
    return body ? textToPreviewHtml(body) : null;
  } catch {
    return null;
  }
}
