"use client";

import { useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { FilePreviewDialog } from "@/components/shared/file-preview-dialog";
import {
  fileDownloadHref,
  filenameFromAttachmentUrl,
} from "@/lib/files/file-preview";

interface FilePreviewLinkProps {
  url: string | null | undefined;
  filename?: string | null;
  title?: string | null;
  children: ReactNode;
  className?: string;
  asButton?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  download?: boolean;
}

export function FilePreviewLink({
  url,
  filename,
  title,
  children,
  className,
  asButton = false,
  variant = "outline",
  size = "sm",
  download = false,
}: FilePreviewLinkProps) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return null;
  }

  const resolvedName = filename?.trim() || filenameFromAttachmentUrl(url);

  if (download) {
    const href = fileDownloadHref(url, resolvedName);
    if (asButton) {
      return (
        <Button asChild variant={variant} size={size} className={className}>
          <a href={href}>{children}</a>
        </Button>
      );
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <>
      {asButton ? (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          onClick={() => setOpen(true)}
        >
          {children}
        </Button>
      ) : (
        <button type="button" className={className} onClick={() => setOpen(true)}>
          {children}
        </button>
      )}
      <FilePreviewDialog
        open={open}
        onOpenChange={setOpen}
        url={url}
        filename={resolvedName}
        title={title}
      />
    </>
  );
}
