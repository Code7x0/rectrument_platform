"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { PdfCanvasPreview } from "@/components/shared/pdf-canvas-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fileDownloadHref, filePreviewHref } from "@/lib/files/file-preview";
import {
  headerPreviewKind,
  resolveClientPreview,
  type ClientPreview,
} from "@/lib/files/resolve-client-preview";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null | undefined;
  filename?: string | null;
  title?: string | null;
}

type PreviewState =
  | { status: "idle" | "loading" }
  | Extract<ClientPreview, { status: "error" | "html" }>
  | { status: "pdf"; bytes: Uint8Array }
  | { status: "image"; src: string };

function wrapPreviewHtml(html: string): string {
  const safe = html.replace(/<\/(script|style|iframe|object|body|html)/gi, "&lt;/$1");
  return `<!doctype html><html><head><meta charset="utf-8" /><style>body{margin:24px;font:14px/1.55 system-ui,sans-serif;color:#0f172a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #e2e8f0;padding:4px 6px;text-align:left}img{max-width:100%;height:auto}</style></head><body>${safe}</body></html>`;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  url,
  filename,
  title,
}: FilePreviewDialogProps) {
  const name = filename?.trim() || title?.trim() || "Document";
  const previewSrc = url ? filePreviewHref(url, filename?.trim() || name) : "";
  const downloadSrc = url ? fileDownloadHref(url, filename?.trim() || name) : "";
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });

  useEffect(() => {
    if (!open || !url || !previewSrc) {
      setPreview({ status: "idle" });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setPreview({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch(previewSrc, { credentials: "include" });
        if (!response.ok) {
          let message = "Unable to load file";
          try {
            const payload = (await response.json()) as { message?: string };
            if (payload.message?.trim()) {
              message = payload.message.trim();
            }
          } catch {
            // Keep the generic message when the body is not JSON.
          }
          throw new Error(message);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const resolved = resolveClientPreview({
          headerKind: headerPreviewKind(response.headers.get("X-Preview-Kind")),
          contentType:
            response.headers.get("Content-Type") ?? "application/octet-stream",
          bytes,
        });

        if (cancelled) {
          return;
        }

        if (resolved.status === "image") {
          const copy = new ArrayBuffer(resolved.bytes.byteLength);
          new Uint8Array(copy).set(resolved.bytes);
          objectUrl = URL.createObjectURL(
            new Blob([copy], { type: resolved.contentType }),
          );
          setPreview({ status: "image", src: objectUrl });
          return;
        }

        setPreview(resolved);
      } catch (error) {
        if (!cancelled) {
          setPreview({
            status: "error",
            message:
              error instanceof Error ? error.message : "Unable to preview file",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, previewSrc, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableTransform
        className="inset-x-0 top-[5vh] mx-auto flex h-[90vh] w-[min(64rem,calc(100vw-2rem))] max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:p-6"
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{title?.trim() || name}</DialogTitle>
          <DialogDescription>
            Preview the document here. Download only if you need a copy.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
          {!url ? (
            <p className="p-6 text-sm text-[#64748B]">No file available.</p>
          ) : preview.status === "loading" || preview.status === "idle" ? (
            <p className="p-6 text-sm text-[#64748B]">Loading preview…</p>
          ) : preview.status === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[#334155]">{preview.message}</p>
              <Button asChild>
                <a href={downloadSrc}>
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          ) : preview.status === "image" ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.src}
                alt={name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : preview.status === "html" ? (
            <iframe
              title={name}
              sandbox=""
              srcDoc={wrapPreviewHtml(preview.html)}
              className="h-full w-full border-0 bg-white"
            />
          ) : preview.status === "pdf" ? (
            <PdfCanvasPreview data={preview.bytes} title={name} />
          ) : null}
        </div>

        {url ? (
          <div className="flex shrink-0 justify-end">
            <Button asChild variant="outline">
              <a href={downloadSrc}>
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
