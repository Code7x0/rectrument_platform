"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Fraunces,
  JetBrains_Mono,
  Space_Grotesk,
} from "next/font/google";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const FLAP_CLASS: Record<string, string> = {
  OPEN: "bg-[#00BFA6] text-[#1A1035]",
  REFERRED: "bg-[#FFC845] text-[#1A1035]",
  INTERVIEWING: "bg-[#B8A6FF] text-[#1A1035]",
  PLACED: "bg-[#FF4D6D] text-[#FFF9F0]",
};

const BOARD_ROWS = [
  {
    role: "Senior Backend Engineer",
    client: "Nimbus Health",
    start: "PLACED",
  },
  {
    role: "Product Designer",
    client: "Loop Robotics",
    start: "INTERVIEWING",
  },
  {
    role: "DevOps Lead",
    client: "Fernbank Systems",
    start: "REFERRED",
  },
  {
    role: "Growth Marketer",
    client: "Alto Finance",
    start: "OPEN",
  },
] as const;

const STATES = ["OPEN", "REFERRED", "INTERVIEWING", "PLACED"] as const;

export function LandingPage() {
  const flapsRef = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      return;
    }

    const timer = window.setInterval(() => {
      const flaps = flapsRef.current.filter(Boolean) as HTMLSpanElement[];
      if (flaps.length === 0) {
        return;
      }
      const flap = flaps[Math.floor(Math.random() * flaps.length)]!;
      const inner = flap.querySelector("[data-flap-inner]");
      if (!inner) {
        return;
      }
      const current = (inner.textContent ?? "OPEN").trim();
      const idx = STATES.indexOf(current as (typeof STATES)[number]);
      const next = STATES[(idx + 1) % STATES.length]!;

      flap.classList.remove("landing-flap-flip");
      void flap.offsetWidth;
      flap.classList.add("landing-flap-flip");

      for (const key of Object.keys(FLAP_CLASS)) {
        const cls = FLAP_CLASS[key];
        if (cls) {
          for (const part of cls.split(" ")) {
            flap.classList.remove(part);
          }
        }
      }
      const nextCls = FLAP_CLASS[next];
      if (nextCls) {
        for (const part of nextCls.split(" ")) {
          flap.classList.add(part);
        }
      }
      inner.textContent = next;
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        space.className,
        "min-h-screen overflow-x-hidden bg-[#FFF9F0] text-[#1A1035] antialiased",
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes landing-flip-down {
  0% { transform: rotateX(90deg); opacity: 0; }
  60% { transform: rotateX(0deg); opacity: 1; }
  100% { transform: rotateX(0deg); opacity: 1; }
}
@keyframes landing-pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}
.landing-flap-flip [data-flap-inner] { animation: landing-flip-down 0.5s ease; }
@media (prefers-reduced-motion: reduce) {
  .landing-flap-flip [data-flap-inner] { animation: none; }
}
`,
        }}
      />

      <header className="sticky top-0 z-50 border-b border-[rgba(26,16,53,0.12)] bg-[rgba(255,249,240,0.86)] backdrop-blur-[10px]">
        <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8">
          <a
            href="#top"
            className={cn(
              fraunces.className,
              "flex items-center gap-2 text-[22px] font-bold tracking-[-0.01em] no-underline",
            )}
          >
            Riff<span className="italic text-[#FF4D6D]">.</span>
          </a>
          <div className="hidden gap-[34px] text-[14.5px] font-semibold md:flex">
            <a className="hover:text-[#FF4D6D]" href="#how">
              How it works
            </a>
            <a className="hover:text-[#FF4D6D]" href="#partners">
              For partners
            </a>
            <a className="hover:text-[#FF4D6D]" href="#clients">
              For clients
            </a>
            <a className="hover:text-[#FF4D6D]" href="#board">
              Live board
            </a>
          </div>
          <div className="flex items-center gap-3">
            <GoogleSignInButton
              label="Sign in with Google"
              variant="outline"
              size="sm"
              className="h-auto min-w-0 rounded-full border-2 border-[#1A1035] bg-transparent px-5 py-2.5 text-sm font-bold text-[#1A1035] shadow-none hover:bg-transparent hover:text-[#1A1035] hover:shadow-[4px_4px_0_#1A1035]"
            />
            <Link
              href={ROUTES.register}
              className="hidden items-center rounded-full border-2 border-[#1A1035] bg-[#FFC845] px-5 py-2.5 text-sm font-bold text-[#1A1035] no-underline transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1A1035] sm:inline-flex"
            >
              Become a Partner
            </Link>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-0 pt-[76px] pb-10">
          <div className="pointer-events-none absolute -top-[140px] -right-[100px] z-0 h-[380px] w-[380px] rounded-full bg-[#FFC845] opacity-35 blur-[2px]" />
          <div className="pointer-events-none absolute -bottom-[100px] -left-[80px] z-0 h-[260px] w-[260px] rounded-full bg-[#00BFA6] opacity-28 blur-[2px]" />
          <div className="relative z-10 mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
              <div>
                <span
                  className={cn(
                    mono.className,
                    "inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.16em] text-[#7C3AED] uppercase before:inline-block before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']",
                  )}
                >
                  Referral-led hiring, done right
                </span>
                <h1
                  className={cn(
                    fraunces.className,
                    "mt-[18px] text-[clamp(40px,5.2vw,68px)] leading-[1.05] font-bold tracking-[-0.015em]",
                  )}
                >
                  <span className="block text-[#1A1035]">Refer talent.</span>
                  <span className="block font-medium italic text-[#FF4D6D]">
                    Skip the chase.
                  </span>
                  <span className="block text-[#7C3AED] underline decoration-[#FFC845] decoration-[3px] decoration-wavy underline-offset-8">
                    Get paid.
                  </span>
                </h1>
                <p className="mt-[22px] max-w-[520px] text-[17.5px] leading-[1.65] text-[rgba(26,16,53,0.78)]">
                  Every active role on the board is moving — referral to
                  interview to payout — and it moves without you writing a
                  pitch, chasing a client, or touching an invoice. You bring the
                  right person. The board does the rest.
                </p>
                <div className="mt-8 flex flex-wrap gap-3.5">
                  <Link
                    href={ROUTES.register}
                    className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#1A1035] bg-[#FFC845] px-7 py-[15px] text-[15px] font-bold text-[#1A1035] no-underline transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1A1035]"
                  >
                    Become a Talent Partner →
                  </Link>
                  <GoogleSignInButton
                    label="Sign in with Google"
                    variant="outline"
                    className="h-auto min-w-0 rounded-full border-2 border-[#1A1035] bg-transparent px-7 py-[15px] text-[15px] font-bold text-[#1A1035] shadow-none hover:bg-transparent hover:text-[#1A1035] hover:shadow-[4px_4px_0_#1A1035]"
                  />
                </div>
                <p
                  className={cn(
                    mono.className,
                    "mt-4 max-w-[440px] text-xs leading-[1.6] text-[rgba(26,16,53,0.55)]",
                  )}
                >
                  Staff sign in by invitation only. Talent Partners register
                  free and unlock login once an admin approves their
                  application.
                </p>
              </div>

              <div
                id="board"
                className="relative rotate-[1.4deg] rounded-[20px] bg-[#1A1035] p-[22px] shadow-[0_10px_30px_rgba(26,16,53,0.12)]"
              >
                <span
                  className={cn(
                    mono.className,
                    "absolute -top-[13px] left-[22px] -rotate-[1.4deg] rounded-md bg-[#FFC845] px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-[#1A1035]",
                  )}
                >
                  LIVE BOARD
                </span>
                <div
                  className={cn(
                    mono.className,
                    "mb-2 grid grid-cols-[1.6fr_1.2fr_1fr] gap-2 border-b border-dashed border-[rgba(255,249,240,0.18)] px-2.5 pt-1.5 pb-3 text-[10.5px] tracking-[0.1em] text-[rgba(255,249,240,0.45)] uppercase",
                  )}
                >
                  <span>Role</span>
                  <span>Client</span>
                  <span>Status</span>
                </div>
                {BOARD_ROWS.map((row, index) => (
                  <div
                    key={row.role}
                    className={cn(
                      "grid grid-cols-[1.6fr_1.2fr_1fr] items-center gap-2 px-2.5 py-2.5",
                      index % 2 === 0 && "rounded-lg bg-[rgba(255,249,240,0.03)]",
                    )}
                  >
                    <span className="text-[13.5px] font-semibold text-[#FFF9F0]">
                      {row.role}
                    </span>
                    <span className="text-[12.5px] text-[rgba(255,249,240,0.55)]">
                      {row.client}
                    </span>
                    <span
                      ref={(el) => {
                        flapsRef.current[index] = el;
                      }}
                      className={cn(
                        mono.className,
                        "inline-block rounded-[5px] px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] [perspective:200px]",
                        FLAP_CLASS[row.start],
                      )}
                    >
                      <span data-flap-inner className="inline-block">
                        {row.start}
                      </span>
                    </span>
                  </div>
                ))}
                <div
                  className={cn(
                    mono.className,
                    "mt-3 flex justify-between border-t border-dashed border-[rgba(255,249,240,0.18)] pt-3 text-[11px] text-[rgba(255,249,240,0.4)]",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 text-[#00BFA6] before:inline-block before:h-1.5 before:w-1.5 before:animate-[landing-pulse-dot_1.6s_infinite] before:rounded-full before:bg-[#00BFA6] before:content-['']">
                    tracking live
                  </span>
                  <span>updated automatically</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="mb-14 max-w-[640px]">
              <span
                className={cn(
                  mono.className,
                  "mb-3.5 inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.16em] text-[#FF4D6D] uppercase before:inline-block before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']",
                )}
              >
                How it works
              </span>
              <h2
                className={cn(
                  fraunces.className,
                  "text-[clamp(30px,3.6vw,44px)] font-bold tracking-[-0.01em]",
                )}
              >
                Three steps. Zero business development.
              </h2>
              <p className="mt-3.5 text-[16.5px] leading-[1.6] text-[rgba(26,16,53,0.7)]">
                This is the whole process — there&apos;s no fourth step where
                you chase an invoice.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 md:gap-0">
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
              ].map((step, i) => (
                <div
                  key={step.n}
                  className={cn(
                    "px-0 md:px-7",
                    i > 0 &&
                      "border-t border-dashed border-[rgba(26,16,53,0.12)] pt-7 md:border-t-0 md:border-l md:pt-0",
                  )}
                >
                  <div
                    className={cn(
                      fraunces.className,
                      "mb-[18px] text-[52px] font-semibold italic text-[#FFF9F0] [-webkit-text-stroke:1.5px_#1A1035]",
                    )}
                  >
                    {step.n}
                  </div>
                  <h3
                    className={cn(
                      fraunces.className,
                      "mb-2.5 text-[21px] font-semibold",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-[1.65] text-[rgba(26,16,53,0.72)]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="bg-[#FFF3E0] py-24">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="mb-14 max-w-[640px]">
              <span
                className={cn(
                  mono.className,
                  "mb-3.5 inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.16em] text-[#7C3AED] uppercase before:inline-block before:h-[7px] before:w-[7px] before:rounded-full before:bg-current before:content-['']",
                )}
              >
                Built for both sides
              </span>
              <h2
                className={cn(
                  fraunces.className,
                  "text-[clamp(30px,3.6vw,44px)] font-bold tracking-[-0.01em]",
                )}
              >
                One board, two ways to win.
              </h2>
              <p className="mt-3.5 text-[16.5px] leading-[1.6] text-[rgba(26,16,53,0.7)]">
                Talent Partners refer. Clients hire. The platform handles
                everything in between.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  tag: "For Talent Partners",
                  tagClass: "bg-[#FF4D6D] text-[#FFF9F0]",
                  title: "Earn without the BD grind",
                  body: "No prospecting, no client calls, no chasing invoices. Refer candidates into roles that are already sold, and let the platform run the rest.",
                  rotate: "-rotate-[1.2deg]",
                },
                {
                  id: "clients",
                  tag: "For Clients",
                  tagClass: "bg-[#7C3AED] text-[#FFF9F0]",
                  title: "Vetted talent, sourced fast",
                  body: "A network of specialist partners sources and screens candidates for your open roles. One point of contact, one contract — not a dozen agencies to juggle.",
                  rotate: "mt-3.5 rotate-[0.6deg]",
                },
                {
                  tag: "Always On",
                  tagClass: "bg-[#00BFA6] text-[#1A1035]",
                  title: "Every status, visible",
                  body: 'Track a role from opening to offer to payout in one place. No spreadsheets, no "just checking in" emails, no guessing where a placement — or a payment — stands.',
                  rotate: "-rotate-[0.4deg]",
                },
              ].map((card) => (
                <div
                  id={"id" in card ? card.id : undefined}
                  key={card.tag}
                  className={cn(
                    "rounded-[18px] border-2 border-[#1A1035] bg-[#FFF9F0] px-[26px] py-[30px] shadow-[0_10px_30px_rgba(26,16,53,0.12)] transition hover:rotate-0 hover:-translate-y-1",
                    card.rotate,
                  )}
                >
                  <span
                    className={cn(
                      mono.className,
                      "mb-[18px] inline-block rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase",
                      card.tagClass,
                    )}
                  >
                    {card.tag}
                  </span>
                  <h3
                    className={cn(
                      fraunces.className,
                      "mb-2.5 text-[22px] font-semibold",
                    )}
                  >
                    {card.title}
                  </h3>
                  <p className="text-[15px] leading-[1.65] text-[rgba(26,16,53,0.72)]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1A1035] py-24 text-[#FFF9F0]">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-10 px-5 sm:px-8">
            <h2
              className={cn(
                fraunces.className,
                "max-w-[560px] text-[clamp(28px,4vw,46px)] text-[#FFF9F0]",
              )}
            >
              Your next placement is{" "}
              <span className="font-medium italic text-[#FFC845]">already</span>{" "}
              on the board.
            </h2>
            <div className="flex flex-col items-start gap-3.5">
              <Link
                href={ROUTES.register}
                className="inline-flex items-center rounded-full border-2 border-[#1A1035] bg-[#FFC845] px-7 py-[15px] text-[15px] font-bold text-[#1A1035] no-underline transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#FFF9F0]"
              >
                Become a Talent Partner →
              </Link>
              <GoogleSignInButton
                label="Sign in with Google"
                variant="outline"
                className="h-auto min-w-0 rounded-full border-2 border-[#FFF9F0] bg-transparent px-7 py-[15px] text-[15px] font-bold text-[#FFF9F0] shadow-none hover:bg-transparent hover:text-[#FFF9F0] hover:shadow-[4px_4px_0_#FFF9F0]"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(255,249,240,0.1)] bg-[#1A1035] px-0 pt-10 pb-8 text-[rgba(255,249,240,0.6)]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
          <a
            href="#top"
            className={cn(
              fraunces.className,
              "text-[22px] font-bold text-[#FFF9F0] no-underline",
            )}
          >
            Riff<span className="italic text-[#FF4D6D]">.</span>
          </a>
          <div className="flex gap-6 text-[13.5px]">
            <a href="#how">How it works</a>
            <a href="#partners">For partners</a>
            <a href="#clients">For clients</a>
          </div>
        </div>
        <p
          className={cn(
            mono.className,
            "mt-5 text-center text-[11.5px] text-[rgba(255,249,240,0.35)]",
          )}
        >
          Built for people who&apos;d rather refer than recruit.
        </p>
      </footer>
    </div>
  );
}
