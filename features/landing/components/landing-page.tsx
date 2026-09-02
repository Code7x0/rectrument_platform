"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Inter, Sora } from "next/font/google";
import { useState } from "react";

import { EmailOtpSignIn } from "@/components/auth/email-otp-sign-in";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  APP_BRAND_MARK,
  APP_NAME_SHORT,
  APP_TAGLINE,
  ROUTES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import "../landing-ovato.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#partners", label: "For partners" },
  { href: "#clients", label: "For clients" },
] as const;

const BOARD_ROWS = [
  {
    role: "Senior Backend Engineer",
    client: "Nimbus Health",
    status: "placed" as const,
    label: "PLACED",
  },
  {
    role: "Product Designer",
    client: "Loop Robotics",
    status: "interviewing" as const,
    label: "INTERVIEWING",
  },
  {
    role: "DevOps Lead",
    client: "Fernbank Systems",
    status: "referred" as const,
    label: "REFERRED",
  },
  {
    role: "Growth Marketer",
    client: "Alto Finance",
    status: "open" as const,
    label: "OPEN",
  },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <Image
        src="/brand/ovato-logo.png"
        alt={`${APP_NAME_SHORT} logo`}
        width={compact ? 32 : 38}
        height={compact ? 32 : 38}
        className="shrink-0 rounded-[9px]"
        priority
      />
      <div className="min-w-0">
        <div
          className={cn(
            sora.className,
            "truncate font-bold tracking-[0.2px] text-[#F6F4FF]",
            compact ? "text-[15px] sm:text-[16px]" : "text-[17px] sm:text-[19px]",
          )}
        >
          {APP_NAME_SHORT}
          <span className="text-[#2FE0C4]">.ai</span>
        </div>
        <div className="truncate text-[10px] text-[#A7A2D6] sm:text-[11px]">
          {APP_TAGLINE}
        </div>
      </div>
    </div>
  );
}

function SignInPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-5 sm:p-6",
        className,
      )}
    >
      <p className="mb-1 text-[13px] font-semibold tracking-wide text-[#F6F4FF] uppercase">
        Partner sign in
      </p>
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#A7A2D6]">
        Already approved? Sign in with Google or a one-time email code.
      </p>
      <div className="flex flex-col gap-3">
        <GoogleSignInButton
          label="Sign in with Google"
          variant="outline"
          className="h-auto min-w-0 w-full rounded-full border-[1.5px] border-[rgba(255,255,255,0.18)] bg-transparent px-6 py-3.5 text-[15px] font-semibold text-[#F6F4FF] shadow-none hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F6F4FF]"
        />
        <div className="flex items-center gap-3 text-[11px] font-medium tracking-wide text-[#A7A2D6] uppercase">
          <span className="h-px flex-1 bg-[rgba(255,255,255,0.12)]" />
          or email
          <span className="h-px flex-1 bg-[rgba(255,255,255,0.12)]" />
        </div>
        <EmailOtpSignIn layout="stacked" tone="dark" />
      </div>
    </div>
  );
}

export function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className={cn(
        inter.className,
        sora.className,
        "ovato-landing min-h-screen overflow-x-hidden antialiased",
      )}
    >
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(11,10,51,0.88)] backdrop-blur-[14px]">
        <nav className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-8 sm:py-4 lg:grid-cols-[auto_1fr_auto]">
          <a href="#top" className="min-w-0 no-underline">
            <BrandMark />
          </a>

          <div className="hidden items-center justify-center gap-8 text-[14.5px] text-[#A7A2D6] lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[#F6F4FF]">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.14)] text-[#F6F4FF] lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <Link
              href={ROUTES.register}
              className="btn-flame shrink-0 whitespace-nowrap px-4 py-2.5 text-[14px] sm:px-7 sm:py-[15px] sm:text-[15.5px]"
            >
              Become a Partner
            </Link>
          </div>
        </nav>

        {mobileNavOpen ? (
          <div className="border-t border-[rgba(255,255,255,0.08)] px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-[15px] text-[#A7A2D6]">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-2 py-2 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F6F4FF]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-0 py-12 sm:py-16 lg:py-24">
          <div className="pointer-events-none absolute -top-[260px] -right-[220px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(255,94,122,0.30),rgba(255,138,55,0.12)_55%,transparent_72%)] blur-[10px]" />
          <div className="pointer-events-none absolute -bottom-[220px] -left-[180px] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(47,224,196,0.16),transparent_70%)]" />
          <div className="relative z-10 mx-auto grid max-w-[1180px] items-start gap-10 px-4 sm:gap-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
            <div className="min-w-0">
              <div className="eyebrow">
                <span className="dot" />
                Referral-led hiring, done right
              </div>
              <h1
                className={cn(
                  sora.className,
                  "mb-5 text-[clamp(34px,7vw,56px)] leading-[1.08] font-extrabold tracking-[-1px] sm:mb-6",
                )}
              >
                Refer talent.
                <br />
                <span className="flame-text">Skip the chase.</span>
                <br />
                Get paid.
              </h1>
              <p className="mb-8 max-w-[520px] text-[16px] leading-[1.65] text-[#A7A2D6] sm:mb-9 sm:text-[18px]">
                Every active role on the board is moving — referral to interview
                to payout — without you writing a pitch, chasing a client, or
                touching an invoice. You bring the right person. {APP_BRAND_MARK}{" "}
                does the rest.
              </p>
              <div className="flex flex-col gap-6">
                <Link
                  href={ROUTES.register}
                  className="btn-flame w-fit max-w-full px-6 py-3.5 text-[15px] sm:px-7 sm:py-[15px] sm:text-[15.5px]"
                >
                  Become a Talent Partner →
                </Link>
                <SignInPanel />
              </div>
              <p className="mt-5 max-w-[520px] text-[13px] leading-[1.6] text-[#A7A2D6] sm:mt-6 sm:text-[13.5px]">
                Staff sign in by invitation only. Talent Partners register free
                and unlock login once an admin approves their application.
              </p>
            </div>

            <div className="board min-w-0" id="board">
              <div className="mb-[18px] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[13px] font-bold tracking-[0.4px]">
                  <span className="live-dot" />
                  LIVE BOARD
                </div>
                <div className="text-[11.5px] text-[#A7A2D6]">
                  updated automatically
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)] text-left text-[11px] font-medium text-[#A7A2D6]">
                      <th className="px-1.5 py-2">Role</th>
                      <th className="hidden px-1.5 py-2 sm:table-cell">Client</th>
                      <th className="px-1.5 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BOARD_ROWS.map((row) => (
                      <tr
                        key={row.role}
                        className="border-b border-[rgba(255,255,255,0.06)] last:border-b-0"
                      >
                        <td className="px-1.5 py-3 text-[13px] font-semibold sm:text-[14px]">
                          {row.role}
                        </td>
                        <td className="hidden px-1.5 py-3 text-[13px] text-[#A7A2D6] sm:table-cell sm:text-[14px]">
                          {row.client}
                        </td>
                        <td className="px-1.5 py-3">
                          <span className={cn("status", row.status)}>
                            {row.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
            <div className="mb-10 max-w-[620px] sm:mb-14">
              <div className="eyebrow">
                <span className="dot" />
                How it works
              </div>
              <h2
                className={cn(
                  sora.className,
                  "text-[clamp(28px,4vw,36px)] leading-[1.2] font-extrabold tracking-[-0.5px]",
                )}
              >
                Three steps. Zero business development.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.7] text-[#A7A2D6] sm:text-[16px]">
                This is the whole process — there&apos;s no fourth step where you
                chase an invoice.
              </p>
            </div>
            <div className="grid gap-5 sm:gap-7 md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Pick a role",
                  body: "Browse live, pre-sold roles from vetted clients. The contract is signed before it ever reaches you — you're not selling anything, just matching.",
                },
                {
                  n: "02",
                  title: "Refer your person",
                  body: "Submit the candidate. We run screening, interviews, and offer logistics with the client — your job ends at the introduction.",
                },
                {
                  n: "03",
                  title: "Get paid on placement",
                  body: "When your candidate starts, your payout releases automatically. No invoice to raise, no client to follow up with.",
                },
              ].map((step) => (
                <div key={step.n} className="step-card">
                  <div className={cn(sora.className, "step-num")}>{step.n}</div>
                  <h3
                    className={cn(
                      sora.className,
                      "mb-2.5 text-[18px] font-bold sm:text-[19px]",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[14px] leading-[1.65] text-[#A7A2D6] sm:text-[14.5px]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
            <div className="mb-10 max-w-[620px] sm:mb-14">
              <div className="eyebrow">
                <span className="dot" />
                Built for both sides
              </div>
              <h2
                className={cn(
                  sora.className,
                  "text-[clamp(28px,4vw,36px)] leading-[1.2] font-extrabold tracking-[-0.5px]",
                )}
              >
                One board, two ways to win.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.7] text-[#A7A2D6] sm:text-[16px]">
                Talent Partners refer. Clients hire. {APP_BRAND_MARK} handles
                everything in between.
              </p>
            </div>
            <div className="grid gap-5 sm:gap-7 lg:grid-cols-2">
              <div className="split-card partner">
                <div className="mb-3.5 text-[12.5px] font-bold tracking-[0.3px] text-[#FF8A37]">
                  FOR TALENT PARTNERS
                </div>
                <h3
                  className={cn(
                    sora.className,
                    "mb-3 text-[21px] font-bold sm:text-[23px]",
                  )}
                >
                  Earn without the BD grind
                </h3>
                <p className="text-[14.5px] leading-[1.7] text-[#A7A2D6] sm:text-[15px]">
                  No prospecting, no client calls, no chasing invoices. Refer
                  candidates into roles that are already sold, and let the
                  platform run the rest.
                </p>
              </div>
              <div className="split-card client" id="clients">
                <div className="mb-3.5 text-[12.5px] font-bold tracking-[0.3px] text-[#2FE0C4]">
                  FOR CLIENTS
                </div>
                <h3
                  className={cn(
                    sora.className,
                    "mb-3 text-[21px] font-bold sm:text-[23px]",
                  )}
                >
                  Vetted talent, sourced fast
                </h3>
                <p className="text-[14.5px] leading-[1.7] text-[#A7A2D6] sm:text-[15px]">
                  A network of specialist partners sources and screens candidates
                  for your open roles. One point of contact, one contract — not a
                  dozen agencies to juggle.
                </p>
              </div>
            </div>
            <div className="always-on flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="icon">◎</div>
              <div>
                <h3
                  className={cn(
                    sora.className,
                    "mb-1.5 text-[17px] font-bold sm:text-[18px]",
                  )}
                >
                  Every status, visible
                </h3>
                <p className="text-[14px] leading-[1.65] text-[#A7A2D6] sm:text-[14.5px]">
                  Track a role from opening to offer to payout in one place. No
                  spreadsheets, no &quot;just checking in&quot; emails, no guessing
                  where a placement — or a payment — stands.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-band px-0 py-16 text-center sm:py-20 lg:py-24">
          <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-8">
            <h2
              className={cn(
                sora.className,
                "mx-auto mb-8 max-w-[720px] text-[clamp(26px,5vw,38px)] leading-[1.15] font-extrabold tracking-[-0.5px]",
              )}
            >
              Your next placement is already on the board.
            </h2>
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
              <Link
                href={ROUTES.register}
                className="btn-flame w-full justify-center px-6 py-3.5 sm:w-auto sm:px-7 sm:py-[15px]"
              >
                Become a Talent Partner →
              </Link>
              <SignInPanel className="text-left" />
            </div>
          </div>
        </section>
      </main>

      <footer className="px-0 py-10 pb-14 sm:py-12 sm:pb-16">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <a href="#top" className="no-underline">
            <BrandMark compact />
          </a>
          <div className="flex flex-wrap gap-5 text-[14px] text-[#A7A2D6] sm:gap-7">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="text-[13px] text-[#A7A2D6] sm:text-[13.5px]">
            Built for people who&apos;d rather refer than recruit.
          </div>
        </div>
      </footer>
    </div>
  );
}
