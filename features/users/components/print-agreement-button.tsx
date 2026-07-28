"use client";

export function PrintAgreementButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-medium text-[#0F172A]"
    >
      Print / Save as PDF
    </button>
  );
}
