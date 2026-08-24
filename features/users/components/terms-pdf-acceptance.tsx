"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasReachedLastPage } from "@/features/users/lib/agreement-scroll";
import { cn } from "@/lib/utils";

const AGREEMENT_PDF_PATH = "/docs/partner-agreement.pdf";
const PDFJS_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";

interface TermsPdfAcceptanceProps {
  accepted: boolean;
  viewed: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onViewedChange: (viewed: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Partner onboarding: official agreement PDF must be opened and read to the
 * last page before “I agree” can be ticked.
 */
export function TermsPdfAcceptance({
  accepted,
  viewed,
  onAcceptedChange,
  onViewedChange,
  error,
  disabled,
}: TermsPdfAcceptanceProps) {
  const [open, setOpen] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(viewed);
  const onViewedChangeRef = useRef(onViewedChange);
  onViewedChangeRef.current = onViewedChange;

  const unlocked = viewed || reachedEnd;

  const markLastPageReached = useCallback(() => {
    setReachedEnd(true);
    onViewedChangeRef.current(true);
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#0F172A]">
          Terms &amp; Conditions
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          View Terms &amp; Conditions
        </Button>
      </div>
      <p className="text-xs text-[#64748B]">
        Open the Talent Partner Agreement and scroll through to the last page.
        The agreement checkbox stays disabled until then.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          disableTransform
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="inset-x-0 top-[2vh] mx-auto flex h-[min(96dvh,calc(100svh-1.5rem))] w-[min(76rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-[#E2E8F0] px-6 py-4 pr-12">
            <DialogTitle>Talent Partner Agreement</DialogTitle>
            <DialogDescription>
              Scroll through the preview to the last page. The agreement
              checkbox unlocks after that.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <AgreementPreview onReachedEnd={markLastPageReached} />
          ) : null}
          <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-6 py-4">
            <label
              className={cn(
                "flex items-start gap-3 text-sm text-[#334155]",
                !unlocked || disabled ? "opacity-60" : null,
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={accepted}
                disabled={!unlocked || disabled}
                onChange={(event) => onAcceptedChange(event.target.checked)}
              />
              <span>
                I have read terms and conditions till last page. I agree.
              </span>
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {!unlocked ? (
        <p className="text-xs text-amber-700">
          Scroll to the last page of the Terms &amp; Conditions to enable
          agreement.
        </p>
      ) : (
        <p className="text-xs text-emerald-700">
          Last page reached — you can agree below.
        </p>
      )}

      <label
        className={cn(
          "flex items-start gap-3 text-sm text-[#334155]",
          !unlocked || disabled ? "opacity-60" : null,
        )}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={accepted}
          disabled={!unlocked || disabled}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />
        <span>
          I have read terms and conditions till last page. I agree.
          {error ? (
            <span className="mt-1 block text-xs text-red-600">{error}</span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function yieldToMain() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function AgreementPreview({ onReachedEnd }: { onReachedEnd: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const reachedRef = useRef(false);
  const onReachedEndRef = useRef(onReachedEnd);
  onReachedEndRef.current = onReachedEnd;
  const [status, setStatus] = useState("Loading agreement…");
  const [error, setError] = useState<string | null>(null);

  const unlockIfFinished = useCallback(() => {
    if (reachedRef.current) {
      return;
    }
    const root = scrollRef.current;
    const last = pagesRef.current?.querySelector(
      "canvas[data-page]:last-of-type",
    );
    if (!root || !(last instanceof HTMLElement)) {
      return;
    }
    if (hasReachedLastPage(root, last)) {
      reachedRef.current = true;
      onReachedEndRef.current();
    }
  }, []);

  useEffect(() => {
    const container = pagesRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let pdfDoc: { destroy: () => Promise<unknown> } | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        const response = await fetch(AGREEMENT_PDF_PATH);
        if (!response.ok) {
          throw new Error("Unable to load the agreement");
        }
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled) {
          return;
        }
        const pdf = await pdfjs.getDocument({ data: data.slice() }).promise;
        pdfDoc = pdf;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        const targetWidth = Math.max(container.clientWidth, 480);
        const firstViewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
        const scale = Math.min(1.35, targetWidth / firstViewport.width);
        const outputScale = Math.min(window.devicePixelRatio || 1, 1.25);

        container.replaceChildren();
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) {
            return;
          }
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.dataset.page = String(pageNumber);
          canvas.setAttribute(
            "aria-label",
            `Talent Partner Agreement page ${pageNumber} of ${pdf.numPages}`,
          );
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "rounded-md bg-white shadow-sm";
          container.appendChild(canvas);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) {
            throw new Error("Unable to render the agreement PDF");
          }
          await page.render({
            canvasContext: context,
            viewport,
            transform:
              outputScale === 1
                ? undefined
                : [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;
          page.cleanup();
          if (!cancelled && (pageNumber === 1 || pageNumber === pdf.numPages)) {
            setStatus(
              pageNumber === pdf.numPages
                ? "Scroll to the last page to agree"
                : `Page 1 of ${pdf.numPages} — keep scrolling`,
            );
          }
          await yieldToMain();
        }

        if (!cancelled) {
          unlockIfFinished();
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Unable to show the agreement preview",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
      void pdfDoc?.destroy();
    };
  }, [unlockIfFinished]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <p className="shrink-0 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-2 text-xs text-[#64748B]">
        {error ?? status}
      </p>
      <div
        ref={scrollRef}
        onScroll={unlockIfFinished}
        className="min-h-0 flex-1 overflow-y-auto bg-[#E2E8F0]"
      >
        {error ? (
          <p className="px-6 py-4 text-sm text-[#B91C1C]">{error}</p>
        ) : (
          <div
            ref={pagesRef}
            className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:p-5"
          />
        )}
      </div>
    </div>
  );
}
