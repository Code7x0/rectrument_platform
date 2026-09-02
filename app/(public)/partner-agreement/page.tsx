import Link from "next/link";

import { APP_BRAND_MARK, APP_NAME, APP_NAME_SHORT, APP_TAGLINE } from "@/lib/constants";

const AGREEMENT_PDF_PATH = "/docs/partner-agreement.pdf";

/**
 * Public viewer for the official OVATO.ai by Talent Socio partner agreement.
 */
export default function PartnerAgreementPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-[#0F172A]">
        <p className="text-sm font-medium text-[#0F766E]">{APP_NAME_SHORT}</p>
        <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Talent Partner Agreement
      </h1>
      <p className="mt-3 text-sm text-[#64748B]">
        Official {APP_NAME} partner agreement (PDF). During registration you
        must read through to the last page, then tick “I have read terms and
        conditions till last page. I agree.”
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#E2E8F0]">
        <iframe
          title={`${APP_NAME} partner agreement`}
          src={`${AGREEMENT_PDF_PATH}#view=FitH`}
          className="h-[80vh] w-full border-0 bg-white"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white"
        >
          Back to registration
        </Link>
        <a
          href={AGREEMENT_PDF_PATH}
          download="OVATO-ai-partner-agreement.pdf"
          className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-medium text-[#0F172A]"
        >
          Download PDF
        </a>
      </div>
    </main>
  );
}
