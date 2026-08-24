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
import { isScrolledToEnd } from "@/features/users/lib/agreement-scroll";
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
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const markLastPageReached = useCallback(() => {
    onViewedChange(true);
  }, [onViewedChange]);

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

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPageCount(0);
            setCurrentPage(1);
          }
        }}
      >
        <DialogContent className="flex h-[min(96dvh,100svh)] w-[min(76rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-[#E2E8F0] px-6 py-4 pr-12">
            <DialogTitle>Talent Partner Agreement</DialogTitle>
            <DialogDescription>
              Scroll through the preview to the last page. The agreement
              checkbox unlocks after that.
              {pageCount > 0
                ? ` Page ${currentPage} of ${pageCount}${
                    viewed
                      ? " — last page reached."
                      : " — continue to the last page."
                  }`
                : null}
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <AgreementPreview
              onPageCount={setPageCount}
              onCurrentPage={setCurrentPage}
              onReachedEnd={markLastPageReached}
            />
          ) : null}
          <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-6 py-4">
            <label
              className={cn(
                "flex items-start gap-3 text-sm text-[#334155]",
                !viewed || disabled ? "opacity-60" : null,
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={accepted}
                disabled={!viewed || disabled}
                onChange={(event) => onAcceptedChange(event.target.checked)}
              />
              <span>
                I have read terms and conditions till last page. I agree.
              </span>
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {!viewed ? (
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
          !viewed || disabled ? "opacity-60" : null,
        )}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={accepted}
          disabled={!viewed || disabled}
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

function AgreementPreview({
  onPageCount,
  onCurrentPage,
  onReachedEnd,
}: {
  onPageCount: (count: number) => void;
  onCurrentPage: (page: number) => void;
  onReachedEnd: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pagesEl, setPagesEl] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const markViewedIfScrolled = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    if (isScrolledToEnd(el)) {
      onReachedEnd();
    }
  }, [onReachedEnd]);

  useEffect(() => {
    if (!pagesEl) {
      return;
    }

    let cancelled = false;
    const container = pagesEl;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        setReady(false);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        const response = await fetch(AGREEMENT_PDF_PATH);
        if (!response.ok) {
          throw new Error("Unable to load the agreement");
        }
        const data = new Uint8Array(await response.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: data.slice() }).promise;
        if (cancelled) {
          return;
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) {
          return;
        }

        const targetWidth = Math.max(container.clientWidth, 560);
        const firstViewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
        const scale = Math.min(
          2.2,
          Math.max(1.25, targetWidth / firstViewport.width),
        );

        container.replaceChildren();
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) {
            return;
          }
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;
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
          const context = canvas.getContext("2d");
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
          if (pageNumber === 1 && !cancelled) {
            setLoading(false);
            onCurrentPage(1);
          }
        }

        if (!cancelled) {
          setReady(true);
          onPageCount(pdf.numPages);
        }
      } catch (renderError) {
        if (!cancelled) {
          setLoading(false);
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
    };
  }, [onCurrentPage, onPageCount, pagesEl]);

  useEffect(() => {
    if (!ready || !pagesEl) {
      return;
    }
    const root = scrollRef.current;
    const last = pagesEl.querySelector("canvas[data-page]:last-of-type");
    if (!root || !(last instanceof HTMLElement)) {
      return;
    }

    const endObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            onReachedEnd();
          }
        }
      },
      { root, threshold: [0.2, 0.4, 1] },
    );
    endObserver.observe(last);

    const canvases = pagesEl.querySelectorAll("canvas[data-page]");
    const pageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) =>
            Number((entry.target as HTMLElement).dataset.page ?? "0"),
          )
          .filter((page) => page > 0);
        if (visible.length > 0) {
          onCurrentPage(Math.max(...visible));
        }
      },
      { root, threshold: 0.35 },
    );
    canvases.forEach((canvas) => pageObserver.observe(canvas));

    markViewedIfScrolled();

    return () => {
      endObserver.disconnect();
      pageObserver.disconnect();
    };
  }, [markViewedIfScrolled, onCurrentPage, onReachedEnd, pagesEl, ready]);

  return (
    <div
      ref={scrollRef}
      onScroll={markViewedIfScrolled}
      className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#E2E8F0]"
    >
      {loading ? (
        <p className="px-6 py-4 text-sm text-[#64748B]">Loading agreement…</p>
      ) : null}
      {error ? (
        <p className="px-6 py-4 text-sm text-[#B91C1C]">{error}</p>
      ) : (
        <div
          ref={setPagesEl}
          className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6"
        />
      )}
    </div>
  );
}
