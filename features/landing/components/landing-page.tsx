"use client";

import Image from "next/image";
import Link from "next/link";
import { Inter, Sora } from "next/font/google";

import { EmailOtpSignIn } from "@/components/auth/email-otp-sign-in";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { APP_BRAND_MARK, APP_NAME_SHORT, APP_TAGLINE, ROUTES } from "@/lib/constants";
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
    <div className="flex items-center gap-3">
      <Image
        src="/brand/ovato-logo.png"
        alt={`${APP_NAME_SHORT} logo`}
        width={compact ? 32 : 38}
        height={compact ? 32 : 38}
        className="rounded-[9px]"
        priority
      />
      <div>
        <div
          className={cn(
            sora.className,
            "font-bold tracking-[0.2px] text-[#F6F4FF]",
            compact ? "text-[16px]" : "text-[19px]",
          )}
        >
          {APP_NAME_SHORT}
          <span className="text-[#2FE0C4]">.ai</span>
        </div>
        <div className="text-[11px] text-[#A7A2D6]">{APP_TAGLINE}</div>
      </div>
    </div>
  );
}

function SignInCluster({ stacked = false }: { stacked?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3",
        stacked ? "w-full max-w-md flex-col items-stretch" : "flex-wrap items-center",
      )}
    >
      <GoogleSignInButton
        label="Sign in with Google"
        variant="outline"
        className={cn(
          "h-auto min-w-0 rounded-full border-[1.5px] border-[rgba(255,255,255,0.18)] bg-transparent px-7 py-[15px] text-[15px] font-semibold text-[#F6F4FF] shadow-none hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F6F4FF]",
          stacked ? "w-full" : "",
        )}
      />
      <EmailOtpSignIn layout={stacked ? "stacked" : "inline"} tone="dark" />
    </div>
  );
}

export function LandingPage() {
  return (
    <div className={cn(inter.className, sora.className, "ovato-landing min-h-screen overflow-x-hidden antialiased")}>
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(11,10,51,0.82)] backdrop-blur-[14px]">
        <nav className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className="no-underline">
            <BrandMark />
          </a>
          <div className="hidden gap-8 text-[14.5px] text-[#A7A2D6] md:flex">
            <a href="#how" className="hover:text-[#F6F4FF]">
              How it works
            </a>
            <a href="#partners" className="hover:text-[#F6F4FF]">
              For partners
            </a>
            <a href="#clients" className="hover:text-[#F6F4FF]">
              For clients
            </a>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
            <SignInCluster />
            <Link href={ROUTES.register} className="btn-flame self-start md:self-auto">
              Become a Partner
            </Link>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-0 py-16 sm:py-24">
          <div className="pointer-events-none absolute -top-[260px] -right-[220px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(255,94,122,0.30),rgba(255,138,55,0.12)_55%,transparent_72%)] blur-[10px]" />
          <div className="pointer-events-none absolute -bottom-[220px] -left-[180px] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(47,224,196,0.16),transparent_70%)]" />
          <div className="relative z-10 mx-auto grid max-w-[1180px] items-start gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="eyebrow">
                <span className="dot" />
                Referral-led hiring, done right
              </div>
              <h1
                className={cn(
                  sora.className,
                  "mb-6 text-[clamp(38px,5vw,56px)] leading-[1.08] font-extrabold tracking-[-1px]",
                )}
              >
                Refer talent.
                <br />
                <span className="flame-text">Skip the chase.</span>
                <br />
                Get paid.
              </h1>
              <p className="mb-9 max-w-[480px] text-[18px] leading-[1.65] text-[#A7A2D6]">
                Every active role on the board is moving — referral to interview
                to payout — without you writing a pitch, chasing a client, or
                touching an invoice. You bring the right person. {APP_BRAND_MARK}{" "}
                does the rest.
              </p>
              <div className="space-y-4">
                <Link href={ROUTES.register} className="btn-flame">
                  Become a Talent Partner →
                </Link>
                <SignInCluster stacked />
              </div>
              <p className="mt-6 max-w-[440px] text-[13.5px] leading-[1.6] text-[#A7A2D6]">
                Staff sign in by invitation only. Talent Partners register free
                and unlock login once an admin approves their application.
              </p>
            </div>

            <div className="board" id="board">
              <div className="mb-[18px] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold tracking-[0.4px]">
                  <span className="live-dot" />
                  LIVE BOARD
                </div>
                <div className="text-[11.5px] text-[#A7A2D6]">updated automatically</div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.1)] text-left text-[11px] font-medium text-[#A7A2D6]">
                    <th className="px-1.5 py-2">Role</th>
                    <th className="px-1.5 py-2">Client</th>
                    <th className="px-1.5 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {BOARD_ROWS.map((row) => (
                    <tr
                      key={row.role}
                      className="border-b border-[rgba(255,255,255,0.06)] last:border-b-0"
                    >
                      <td className="px-1.5 py-3 text-[14px] font-semibold">{row.role}</td>
                      <td className="px-1.5 py-3 text-[14px] text-[#A7A2D6]">{row.client}</td>
                      <td className="px-1.5 py-3">
                        <span className={cn("status", row.status)}>{row.label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="how" className="py-20 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="mb-14 max-w-[620px]">
              <div className="eyebrow">
                <span className="dot" />
                How it works
              </div>
              <h2 className={cn(sora.className, "text-[36px] leading-[1.2] font-extrabold tracking-[-0.5px]")}>
                Three steps. Zero business development.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-[#A7A2D6]">
                This is the whole process — there&apos;s no fourth step where you
                chase an invoice.
              </p>
            </div>
            <div className="grid gap-7 md:grid-cols-3">
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
                  <h3 className={cn(sora.className, "mb-2.5 text-[19px] font-bold")}>{step.title}</h3>
                  <p className="text-[14.5px] leading-[1.65] text-[#A7A2D6]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="py-20 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="mb-14 max-w-[620px]">
              <div className="eyebrow">
                <span className="dot" />
                Built for both sides
              </div>
              <h2 className={cn(sora.className, "text-[36px] leading-[1.2] font-extrabold tracking-[-0.5px]")}>
                One board, two ways to win.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-[#A7A2D6]">
                Talent Partners refer. Clients hire. {APP_BRAND_MARK} handles
                everything in between.
              </p>
            </div>
            <div className="grid gap-7 lg:grid-cols-2">
              <div className="split-card partner">
                <div className="mb-3.5 text-[12.5px] font-bold tracking-[0.3px] text-[#FF8A37]">
                  FOR TALENT PARTNERS
                </div>
                <h3 className={cn(sora.className, "mb-3 text-[23px] font-bold")}>
                  Earn without the BD grind
                </h3>
                <p className="text-[15px] leading-[1.7] text-[#A7A2D6]">
                  No prospecting, no client calls, no chasing invoices. Refer
                  candidates into roles that are already sold, and let the
                  platform run the rest.
                </p>
              </div>
              <div className="split-card client" id="clients">
                <div className="mb-3.5 text-[12.5px] font-bold tracking-[0.3px] text-[#2FE0C4]">
                  FOR CLIENTS
                </div>
                <h3 className={cn(sora.className, "mb-3 text-[23px] font-bold")}>
                  Vetted talent, sourced fast
                </h3>
                <p className="text-[15px] leading-[1.7] text-[#A7A2D6]">
                  A network of specialist partners sources and screens candidates
                  for your open roles. One point of contact, one contract — not a
                  dozen agencies to juggle.
                </p>
              </div>
            </div>
            <div className="always-on flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="icon">◎</div>
              <div>
                <h3 className={cn(sora.className, "mb-1.5 text-[18px] font-bold")}>
                  Every status, visible
                </h3>
                <p className="text-[14.5px] leading-[1.65] text-[#A7A2D6]">
                  Track a role from opening to offer to payout in one place. No
                  spreadsheets, no &quot;just checking in&quot; emails, no guessing
                  where a placement — or a payment — stands.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-band px-0 py-20 text-center sm:py-24">
          <div className="relative z-10 mx-auto max-w-[1180px] px-5 sm:px-8">
            <h2 className={cn(sora.className, "mb-8 text-[clamp(28px,4vw,38px)] font-extrabold tracking-[-0.5px]")}>
              Your next placement is already on the board.
            </h2>
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
              <Link href={ROUTES.register} className="btn-flame">
                Become a Talent Partner →
              </Link>
              <SignInCluster stacked />
            </div>
          </div>
        </section>
      </main>

      <footer className="px-0 py-12 pb-16">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-5 sm:px-8">
          <a href="#top" className="no-underline">
            <BrandMark compact />
          </a>
          <div className="flex gap-7 text-[14px] text-[#A7A2D6]">
            <a href="#how">How it works</a>
            <a href="#partners">For partners</a>
            <a href="#clients">For clients</a>
          </div>
          <div className="text-[13.5px] text-[#A7A2D6]">
            Built for people who&apos;d rather refer than recruit.
          </div>
        </div>
      </footer>
    </div>
  );
}
