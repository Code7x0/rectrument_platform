import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { PrintAgreementButton } from "@/features/users/components/print-agreement-button";

/**
 * Printable TalentSocio Partner Agreement summary for registration.
 * Partners print/sign and upload on /register. Static app content only.
 */
export default function PartnerAgreementPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#0F172A]">
      <p className="text-sm font-medium text-[#0F766E]">{APP_NAME}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Talent Partner Agreement
      </h1>
      <p className="mt-3 text-[#475569]">
        Print or save this page, sign it, and upload the signed copy when you
        register. For a company-stamped PDF, contact{" "}
        <a
          href="mailto:delivery@talentsocio.com"
          className="font-medium text-[#0F766E] underline-offset-2 hover:underline"
        >
          delivery@talentsocio.com
        </a>
        .
      </p>

      <section className="mt-10 space-y-6 text-sm leading-relaxed text-[#334155]">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">1. Role</h2>
          <p className="mt-2">
            You act as an independent Talent Partner for TalentSocio. You source
            and submit candidates for jobs allocated to you on the platform.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            2. Confidentiality
          </h2>
          <p className="mt-2">
            Client names, job details, candidate data, and commercial terms are
            confidential. Do not share them outside the recruitment process.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            3. Candidate quality
          </h2>
          <p className="mt-2">
            Submissions must be accurate, with valid contact details and a
            current resume. Misrepresentation may result in deactivation.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">4. Payouts</h2>
          <p className="mt-2">
            Eligibility and payment follow the job payout terms and TalentSocio
            approval after a candidate joins. Track status in My Earnings.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            5. Documents
          </h2>
          <p className="mt-2">
            You will upload PAN, Aadhaar, and this signed agreement for
            verification before or during onboarding.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6">
          <p>Partner name: _______________________________</p>
          <p className="mt-4">Signature: ________________________________</p>
          <p className="mt-4">Date: ____________________________________</p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white"
        >
          Back to registration
        </Link>
        <PrintAgreementButton />
      </div>
    </main>
  );
}
