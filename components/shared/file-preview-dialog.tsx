"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isInlinePreviewableFile } from "@/lib/files/document-types";
import { fileDownloadHref, filePreviewHref } from "@/lib/files/file-preview";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null | undefined;
  filename?: string | null;
  title?: string | null;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  url,
  filename,
  title,
}: FilePreviewDialogProps) {
  const name = filename?.trim() || "Document";
  const previewable = isInlinePreviewableFile(name);
  const previewSrc = url ? filePreviewHref(url, name) : "";
  const downloadSrc = url ? fileDownloadHref(url, name) : "";
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(name);

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
          ) : previewable && isImage ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : previewable ? (
            <iframe
              title={name}
              src={previewSrc}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[#334155]">
                This file type cannot be previewed in the browser. Download it
                to open locally.
              </p>
              <Button asChild>
                <a href={downloadSrc}>
                  <Download className="h-4 w-4" />
                  Download {name}
                </a>
              </Button>
            </div>
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
