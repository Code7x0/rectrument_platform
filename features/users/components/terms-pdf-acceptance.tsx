"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AGREEMENT_PDF_PATH = "/docs/partner-agreement.pdf";
const AGREEMENT_FALLBACK_PATH = "/partner-agreement";

interface TermsPdfAcceptanceProps {
  accepted: boolean;
  viewed: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onViewedChange: (viewed: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Terms acceptance gated on viewing/scrolling the Partner Agreement PDF
 * (or the in-app fallback agreement page when the PDF is not yet supplied).
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const markViewedIfScrolled = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 48) {
      onViewedChange(true);
    }
  }, [onViewedChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(markViewedIfScrolled, 300);
    return () => window.clearTimeout(timer);
  }, [open, pdfAvailable, markViewedIfScrolled]);

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
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Hide agreement" : "View Terms & Conditions"}
        </Button>
      </div>
      <p className="text-xs text-[#64748B]">
        Open the Partner Agreement, scroll through it, then tick the acceptance
        box.{" "}
        <Link
          href={src}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#0F766E] underline-offset-2 hover:underline"
        >
          Open in a new tab
        </Link>
      </p>

      {open ? (
        <div
          ref={scrollRef}
          onScroll={markViewedIfScrolled}
          className="h-64 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white"
        >
          {pdfAvailable === true ? (
            <iframe
              title="Partner Agreement PDF"
              src={`${AGREEMENT_PDF_PATH}#view=FitH`}
              className="min-h-[640px] w-full border-0"
            />
          ) : (
            <iframe
              title="Partner Agreement"
              src={AGREEMENT_FALLBACK_PATH}
              className="min-h-[640px] w-full border-0"
            />
          )}
        </div>
      ) : null}

      {!viewed ? (
        <p className="text-xs text-amber-700">
          Scroll through the Terms &amp; Conditions to enable acceptance.
        </p>
      ) : (
        <p className="text-xs text-emerald-700">
          Agreement reviewed — you can accept below.
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
          I have reviewed and accept the{" "}
          <button
            type="button"
            className="font-medium text-[#0F766E] underline-offset-2 hover:underline"
            onClick={() => setOpen(true)}
          >
            Terms &amp; Conditions
          </button>{" "}
          and confirm the documents uploaded are accurate.
          {error ? (
            <span className="mt-1 block text-xs text-red-600">{error}</span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
