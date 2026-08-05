export function isAllowedAttachmentUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host === "dl.airtable.com" ||
      host === "airtableusercontent.com" ||
      host.endsWith(".airtableusercontent.com")
    );
  } catch {
    return false;
  }
}

export function filenameFromAttachmentUrl(
  url: string,
  fallback = "document",
): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    if (last && /\.[a-z0-9]+$/i.test(last)) {
      return sanitizeDownloadFilename(last);
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function sanitizeDownloadFilename(filename: string | null | undefined): string {
  const cleaned = (filename ?? "document")
    .replace(/[\r\n"]/g, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .trim();
  return cleaned || "document";
}

export function filePreviewHref(
  url: string,
  filename?: string | null,
): string {
  const params = new URLSearchParams({ url });
  if (filename?.trim()) {
    params.set("filename", filename.trim());
  }
  return `/api/files?${params.toString()}`;
}

export function fileDownloadHref(
  url: string,
  filename?: string | null,
): string {
  const params = new URLSearchParams({ url, download: "1" });
  if (filename?.trim()) {
    params.set("filename", filename.trim());
  }
  return `/api/files?${params.toString()}`;
}
