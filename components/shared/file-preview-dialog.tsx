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
          throw new Error("Unable to load file");
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const headerKind = response.headers.get("X-Preview-Kind") as
          | SniffedFileKind
          | null;
        const kind =
          headerKind && headerKind !== "unknown"
            ? headerKind
            : sniffFileKind(bytes);
        const contentType =
          response.headers.get("Content-Type")?.split(";")[0]?.trim() ??
          "application/octet-stream";

        if (cancelled) {
          return;
        }

        if (kind === "pdf" || contentType === "application/pdf") {
          objectUrl = URL.createObjectURL(
            new Blob([buffer], { type: "application/pdf" }),
          );
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

        if (kind === "docx" || kind === "doc" || contentType.includes("word")) {
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            if (cancelled) {
              return;
            }
            if (result.value?.trim()) {
              setPreview({ status: "html", html: result.value });
              return;
            }
          } catch {
            // Fall through to generic preview / download.
          }
        }

        objectUrl = URL.createObjectURL(new Blob([buffer], { type: contentType }));
        setPreview({ status: "pdf", src: objectUrl });
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
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
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
            <div
              className="h-full overflow-auto bg-white p-6 text-sm leading-relaxed text-[#0F172A] [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-2 [&_table]:mb-3 [&_table]:w-full [&_td]:border [&_td]:border-[#E2E8F0] [&_td]:p-1 [&_th]:border [&_th]:border-[#E2E8F0] [&_th]:p-1"
              dangerouslySetInnerHTML={{ __html: preview.html }}
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
