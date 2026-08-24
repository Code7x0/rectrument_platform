"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        Open the Talent Partner Agreement in a larger view and read through to
        the last page. The agreement checkbox stays disabled until then.{" "}
        <Link
          href={AGREEMENT_PDF_PATH}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#0F766E] underline-offset-2 hover:underline"
        >
          Open PDF in a new tab
        </Link>
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
        <DialogContent className="flex h-[min(96dvh,100svh)] w-[min(76rem,calc(100vw-1rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-[#E2E8F0] px-6 py-4 pr-12">
            <DialogTitle>Talent Partner Agreement</DialogTitle>
            <DialogDescription>
              Read through to the last page. The agreement checkbox unlocks
              after that.
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
            <AgreementDocument
              viewed={viewed}
              onPageCount={setPageCount}
              onCurrentPage={setCurrentPage}
              onReachedEnd={markLastPageReached}
            />
          ) : null}
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

function AgreementDocument({
  viewed,
  onPageCount,
  onCurrentPage,
  onReachedEnd,
}: {
  viewed: boolean;
  onPageCount: (count: number) => void;
  onCurrentPage: (page: number) => void;
  onReachedEnd: () => void;
}) {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [countFailed, setCountFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        const pdf = await pdfjs.getDocument({ url: AGREEMENT_PDF_PATH }).promise;
        if (cancelled) {
          return;
        }
        setTotal(pdf.numPages);
        onPageCount(pdf.numPages);
        onCurrentPage(1);
      } catch {
        if (!cancelled) {
          setCountFailed(true);
          onPageCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onCurrentPage, onPageCount]);

  useEffect(() => {
    if (total > 0 && page >= total) {
      onReachedEnd();
    }
  }, [page, total, onReachedEnd]);

  function goTo(next: number) {
    const bounded = Math.min(Math.max(next, 1), total || next);
    setPage(bounded);
    onCurrentPage(bounded);
  }

  return (
    <>
      <iframe
        title="Talent Partner Agreement"
        src={`${AGREEMENT_PDF_PATH}#page=${page}&view=FitH&zoom=page-width`}
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          Previous page
        </Button>
        <p className="text-sm text-[#334155]">
          {total > 0 ? `Page ${page} of ${total}` : "Loading pages…"}
        </p>
        {countFailed && !viewed ? (
          <Button type="button" size="sm" onClick={onReachedEnd}>
            I&apos;ve read the last page
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={total > 0 && page >= total}
            onClick={() => goTo(page + 1)}
          >
            Next page
          </Button>
        )}
      </div>
    </>
  );
}
