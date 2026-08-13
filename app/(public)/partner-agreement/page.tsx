import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { PrintAgreementButton } from "@/features/users/components/print-agreement-button";

/**
 * Generic / interim Talent Partner Agreement shown during registration
 * until the official client PDF is placed at /docs/partner-agreement.pdf.
 */
export default function PartnerAgreementPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#0F172A]">
      <p className="text-sm font-medium text-[#0F766E]">{APP_NAME}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Talent Partner Agreement
      </h1>
      <p className="mt-3 text-sm text-[#64748B]">
        Interim generic agreement for platform registration. This will be
        replaced by the official TalentSocio Partner Agreement PDF when
        supplied. Questions:{" "}
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
          <h2 className="text-base font-semibold text-[#0F172A]">
            1. Parties and purpose
          </h2>
          <p className="mt-2">
            This agreement is between TalentSocio (“Company”) and you (“Talent
            Partner” / “Partner”). By accepting Terms &amp; Conditions on the
            registration form, you agree to source and submit candidates for
            roles shared with you on {APP_NAME}, under the terms below.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            2. Independent contractor
          </h2>
          <p className="mt-2">
            You are an independent Talent Partner, not an employee, agent, or
            joint venture of TalentSocio. You are responsible for your own
            taxes, tools, and working methods, and you may not bind TalentSocio
            to any third-party commitment without written approval.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            3. Scope of work
          </h2>
          <p className="mt-2">
            After approval and job allocation (or approved claim), you may:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Review allocated job details on the platform</li>
            <li>Source suitable candidates and submit profiles as required</li>
            <li>Provide accurate screening notes and contact information</li>
            <li>Respond to Account Manager feedback in a timely manner</li>
          </ul>
          <p className="mt-2">
            TalentSocio may approve, reject, reallocate, or close jobs at its
            discretion. Access to jobs depends on your account status and
            platform rules.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            4. Candidate quality and integrity
          </h2>
          <p className="mt-2">
            All submissions must be truthful and complete. You must not:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Misrepresent candidate experience, education, or identity</li>
            <li>Submit fabricated resumes or contact details</li>
            <li>Submit the same candidate fraudulently across conflicting jobs</li>
            <li>Share misleading payout or offer information with candidates</li>
          </ul>
          <p className="mt-2">
            Breaches may lead to rejection of submissions, withheld payouts,
            suspension, or permanent deactivation.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            5. Confidentiality
          </h2>
          <p className="mt-2">
            You will keep confidential all non-public information obtained
            through the platform, including client names, job descriptions,
            compensation bands, commercial terms, candidate data, and internal
            process notes. You will use such information only to perform
            sourcing for TalentSocio and will not disclose it to unauthorized
            parties.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            6. Data protection and privacy
          </h2>
          <p className="mt-2">
            You will handle candidate personal data carefully and only for
            legitimate recruitment purposes related to allocated roles. You will
            not sell, publish, or reuse candidate data for unrelated marketing
            or competing platforms. TalentSocio may process your registration
            and KYC documents to verify eligibility and operate the Partner
            program.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            7. Identity visibility
          </h2>
          <p className="mt-2">
            You may choose to keep your name private on the platform. When
            private, Account Managers typically see your Partner Code rather
            than your personal name. TalentSocio administrators may still access
            your identity for verification, compliance, support, and payouts.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            8. Documents and verification
          </h2>
          <p className="mt-2">
            During registration you must upload Resume, PAN, and Aadhaar (or
            equivalent documents as requested). TalentSocio may verify these
            before activating your account. Providing false documents is grounds
            for immediate rejection or termination. A separate signed PDF upload
            is not required at signup; acceptance of this agreement is recorded
            electronically when you check Terms &amp; Conditions after reviewing
            the document.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">9. Payouts</h2>
          <p className="mt-2">
            Payout eligibility follows the commercial terms shown on each job
            and TalentSocio’s approval process (typically after a candidate
            joins and any applicable guarantee / confirmation period). Bank
            details you provide are used for payouts only. TalentSocio may
            withhold or adjust payouts where fraud, duplicate submissions, early
            attrition rules, or client non-payment apply, as communicated in job
            or program terms.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            10. Non-solicitation (platform relationships)
          </h2>
          <p className="mt-2">
            While active as a Talent Partner and for a reasonable period after
            deactivation, you agree not to misuse platform introductions to
            bypass TalentSocio and deal directly with clients introduced solely
            through this program, except where TalentSocio gives prior written
            consent or where a pre-existing relationship can be shown.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            11. Platform use and conduct
          </h2>
          <p className="mt-2">
            You will keep login credentials secure, comply with applicable laws,
            and communicate professionally with Account Managers and candidates.
            Harassment, spam, or abuse of the platform may result in suspension.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            12. Term and termination
          </h2>
          <p className="mt-2">
            This agreement starts when you accept Terms &amp; Conditions and
            continues until your Partner account is deactivated. Either party
            may end the relationship subject to outstanding submissions and
            payout settlements. Confidentiality and data obligations survive
            termination.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            13. Changes
          </h2>
          <p className="mt-2">
            TalentSocio may update Partner program rules or replace this interim
            agreement with an official PDF agreement. Material updates may be
            communicated in-app or by email. Continued use of the platform after
            notice may constitute acceptance of updated terms.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            14. Acceptance
          </h2>
          <p className="mt-2">
            By reviewing this agreement and checking the acceptance box on the
            registration form, you confirm that you have read and understood
            these terms, that the documents you upload are accurate, and that
            you wish to apply as a Talent Partner with TalentSocio.
          </p>
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
