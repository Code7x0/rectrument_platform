"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

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
  isImageKind,
  sniffFileKind,
  type SniffedFileKind,
} from "@/lib/files/sniff-file";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null | undefined;
  filename?: string | null;
  title?: string | null;
}

type PreviewState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "pdf" | "image"; src: string }
  | { status: "html"; html: string };

function headerPreviewKind(response: Response): SniffedFileKind | null {
  const kind = response.headers.get("X-Preview-Kind");
  if (
    kind === "pdf" ||
    kind === "png" ||
    kind === "jpeg" ||
    kind === "gif" ||
    kind === "webp" ||
    kind === "docx" ||
    kind === "doc" ||
    kind === "unknown"
  ) {
    return kind;
  }
  return null;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  url,
  filename,
  title,
}: FilePreviewDialogProps) {
  const name = filename?.trim() || "Document";
  const previewSrc = url ? filePreviewHref(url, name) : "";
  const downloadSrc = url ? fileDownloadHref(url, name) : "";
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

        const contentType =
          response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() ??
          "application/octet-stream";
        const headerKind = headerPreviewKind(response);

        if (headerKind === "pdf" || contentType === "application/pdf") {
          await response.body?.cancel();
          if (cancelled) {
            return;
          }
          setPreview({ status: "pdf", src: previewSrc });
          return;
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const kind =
          headerKind && headerKind !== "unknown" ? headerKind : sniffFileKind(bytes);

        if (cancelled) {
          return;
        }

        if (contentType === "text/html" || (kind === "docx" && contentType.includes("html"))) {
          const html = new TextDecoder("utf-8").decode(bytes).trim();
          if (!html) {
            throw new Error("This Word document does not contain previewable text.");
          }
          setPreview({ status: "html", html });
          return;
        }

        if (kind === "pdf") {
          objectUrl = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
          setPreview({ status: "pdf", src: objectUrl });
          return;
        }

        if (isImageKind(kind) || contentType.startsWith("image/")) {
          objectUrl = URL.createObjectURL(
            new Blob([buffer], {
              type: contentType.startsWith("image/") ? contentType : "image/jpeg",
            }),
          );
          setPreview({ status: "image", src: objectUrl });
          return;
        }

        if (kind === "doc") {
          throw new Error(
            "Older Word (.doc) files can’t be previewed in the browser. Download the file to open it.",
          );
        }

        if (kind === "docx") {
          throw new Error("Unable to preview this Word document. Download the file to open it.");
        }

        throw new Error("This file type can’t be previewed in the browser.");
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
        className="inset-x-0 top-[5vh] mx-auto flex h-[90vh] w-[min(64rem,calc(100vw-2rem))] max-w-5xl flex-col gap-3 overflow-hidden p-4 duration-0 data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6"
        style={{ transform: "none" }}
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
                  Download {name}
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
              srcDoc={`<!doctype html><html><head><meta charset="utf-8" /><style>body{margin:24px;font:14px/1.55 system-ui,sans-serif;color:#0f172a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #e2e8f0;padding:4px 6px;text-align:left}img{max-width:100%;height:auto}</style></head><body>${preview.html.replace(/<\/(script|style|iframe|object|body|html)/gi, "&lt;/$1")}</body></html>`}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <iframe
              title={name}
              src={preview.src}
              className="h-full w-full border-0 bg-white"
            />
          )}
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
