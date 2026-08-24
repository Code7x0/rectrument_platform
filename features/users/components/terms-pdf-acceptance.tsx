"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

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
const AGREEMENT_FALLBACK_PATH = "/partner-agreement";
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
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderError, setRenderError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(AGREEMENT_PDF_PATH, { method: "HEAD" })
      .then((response) => {
        if (!cancelled) {
          setPdfAvailable(response.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPdfAvailable(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markLastPageReached = useCallback(() => {
    onViewedChange(true);
  }, [onViewedChange]);

  const markViewedIfScrolled = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    if (isScrolledToEnd(el)) {
      markLastPageReached();
    }
  }, [markLastPageReached]);

  useEffect(() => {
    if (!open || pdfAvailable !== true) {
      return;
    }
    let cancelled = false;
    const container = pagesRef.current;
    if (!container) {
      return;
    }

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        const pdf = await pdfjs.getDocument({ url: AGREEMENT_PDF_PATH }).promise;
        if (cancelled) {
          return;
        }
        setCurrentPage(1);
        setRenderError(null);
        setPageCount(0);
        container.replaceChildren();

        const targetWidth = Math.max(container.clientWidth, 720);
        const firstViewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
        const scale = Math.min(
          2.4,
          Math.max(1.35, targetWidth / firstViewport.width),
        );

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
        }
        if (!cancelled) {
          setPageCount(pdf.numPages);
        }
      } catch (error) {
        if (!cancelled) {
          setRenderError(
            error instanceof Error
              ? error.message
              : "Unable to render the agreement PDF",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [open, pdfAvailable]);

  useEffect(() => {
    if (!open || !pageCount || pdfAvailable !== true) {
      return;
    }
    const root = scrollRef.current;
    const last = pagesRef.current?.querySelector(
      `canvas[data-page="${pageCount}"]`,
    );
    if (!root || !(last instanceof HTMLElement)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            markLastPageReached();
          }
        }
      },
      { root, threshold: [0.35, 0.6, 1] },
    );
    observer.observe(last);

    const canvases = pagesRef.current?.querySelectorAll("canvas[data-page]");
    const pageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) =>
            Number((entry.target as HTMLElement).dataset.page ?? "0"),
          )
          .filter((page) => page > 0);
        if (visible.length > 0) {
          setCurrentPage(Math.max(...visible));
        }
      },
      { root, threshold: 0.4 },
    );
    canvases?.forEach((canvas) => pageObserver.observe(canvas));

    return () => {
      observer.disconnect();
      pageObserver.disconnect();
    };
  }, [open, pageCount, pdfAvailable, markLastPageReached, renderError]);

  const src =
    pdfAvailable === true ? AGREEMENT_PDF_PATH : AGREEMENT_FALLBACK_PATH;

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
        Open the Talent Partner Agreement in a larger view and read through to
        the last page. The agreement checkbox stays disabled until then.{" "}
        <Link
          href={src}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#0F766E] underline-offset-2 hover:underline"
        >
          Open PDF in a new tab
        </Link>
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-[min(96dvh,100svh)] w-[min(76rem,calc(100vw-1rem))] max-w-none flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-[#E2E8F0] px-6 py-4 pr-12">
            <DialogTitle>Talent Partner Agreement</DialogTitle>
            <DialogDescription>
              Read through to the last page. The agreement checkbox unlocks
              after that.
              {pageCount > 0 && pdfAvailable === true && !renderError
                ? ` Page ${currentPage} of ${pageCount}${
                    viewed
                      ? " — last page reached."
                      : " — continue to the last page."
                  }`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div
            ref={scrollRef}
            onScroll={markViewedIfScrolled}
            className="min-h-0 flex-1 overflow-y-auto bg-[#E2E8F0]"
          >
            {pdfAvailable === true && !renderError ? (
              <div
                ref={pagesRef}
                className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 p-4 sm:p-6"
              />
            ) : (
              <iframe
                title="Partner Agreement"
                src={AGREEMENT_FALLBACK_PATH}
                className="h-full min-h-full w-full border-0 bg-white"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!viewed ? (
        <p className="text-xs text-amber-700">
          Open the agreement and continue to the last page to enable agreement.
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
