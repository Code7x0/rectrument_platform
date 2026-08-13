"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Inter, Zilla_Slab } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { springs } from "@/components/motion/presets";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const zilla = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const feeRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (reduce) {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      if (feeRef.current) {
        feeRef.current.textContent = "INR 75,000";
      }
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set("[data-reveal]", { opacity: 0, y: 18 });
      gsap.set("[data-ledger-step]", { opacity: 0, x: -10 });
      gsap.set(cardRef.current, { opacity: 0, y: 28, rotate: -1.2 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to("[data-reveal='brand']", { opacity: 1, y: 0, duration: 0.55 })
        .to(
          "[data-reveal='line']",
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 },
          "-=0.25",
        )
        .to(
          "[data-reveal='copy']",
          { opacity: 1, y: 0, duration: 0.5 },
          "-=0.2",
        )
        .to(
          "[data-reveal='cta']",
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 },
          "-=0.25",
        )
        .to(
          "[data-reveal='note']",
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2",
        )
        .to(
          cardRef.current,
          { opacity: 1, y: 0, rotate: 0, duration: 0.7 },
          "-=0.55",
        )
        .to(
          "[data-ledger-step]",
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.1 },
          "-=0.25",
        );

      const fee = { value: 0 };
      tl.to(
        fee,
        {
          value: 75000,
          duration: 1.1,
          ease: "power2.out",
          onUpdate: () => {
            if (feeRef.current) {
              feeRef.current.textContent = `INR ${Math.round(fee.value).toLocaleString("en-IN")}`;
            }
          },
        },
        "-=0.35",
      );

      gsap.to(cardRef.current, {
        y: -8,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.4,
      });

      gsap.to("[data-reveal='value']", {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.12,
        delay: 0.9,
        ease: "power2.out",
      });

      gsap.to("[data-pulse-dot]", {
        scale: 1.35,
        opacity: 0.55,
        duration: 1.1,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.25,
      });
    }, root);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <main
      ref={rootRef}
      className={cn(
        inter.className,
        "min-h-screen bg-[#F5F6FA] text-[#14162B] antialiased",
      )}
    >
      <div className="mx-auto max-w-[1120px] px-6 sm:px-8">
        <header className="pt-7">
          <p
            data-reveal="brand"
            className="text-[12px] font-semibold tracking-[0.14em] text-[#8A5D14] uppercase"
          >
            Recruiting Partner Platform
          </p>
        </header>

        <section className="grid items-center gap-10 py-9 pb-12 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pb-20">
          <div>
            <h1
              className={cn(
                zilla.className,
                "mt-[18px] mb-[22px] text-[40px] leading-[1.04] font-bold tracking-[-0.01em] md:text-[56px]",
              )}
            >
              <span data-reveal="line" className="block">
                Refer talent.
              </span>
              <span data-reveal="line" className="block">
                Skip the chase.
              </span>
              <em
                data-reveal="line"
                className="block not-italic text-[#8A5D14] [background-image:linear-gradient(transparent_62%,rgba(227,167,59,0.35)_0)]"
              >
                Get paid.
              </em>
            </h1>
            <p
              data-reveal="copy"
              className="mb-8 max-w-[520px] text-base leading-[1.55] text-[#5B5F73] md:text-lg"
            >
              Live, pre‑sold roles come to you — we own the client relationship,
              the contract, and the invoice. You source, refer, and close, and
              earn a payout on every placement.
            </p>

            <div className="mb-[18px] flex flex-wrap gap-3">
              <motion.div
                data-reveal="cta"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={springs.press}
              >
                <GoogleSignInButton
                  label="Sign in with Google"
                  variant="outline"
                  className="h-auto w-auto min-w-0 justify-center rounded-[9px] border-[1.5px] border-[#E2E4EE] bg-white px-[22px] py-[13px] text-[15px] font-semibold text-[#14162B] shadow-none hover:bg-white hover:text-[#14162B]"
                />
              </motion.div>
              <motion.div
                data-reveal="cta"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springs.press}
              >
                <Link
                  href={ROUTES.register}
                  className="inline-flex items-center justify-center rounded-[9px] bg-[#14162B] px-[22px] py-[13px] text-[15px] font-semibold text-white no-underline shadow-[0_10px_24px_rgba(20,22,43,0.18)]"
                >
                  Become a Talent Partner
                </Link>
              </motion.div>
            </div>

            <p
              data-reveal="note"
              className="max-w-[460px] text-[13px] leading-[1.5] text-[#5B5F73]"
            >
              <span className="font-semibold text-[#14162B]">Staff</span> sign
              in by invitation only.{" "}
              <span className="font-semibold text-[#14162B]">
                Talent Partners
              </span>{" "}
              register publicly and unlock login once approved by an admin.
            </p>
          </div>

          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl bg-[#1B2340] px-[26px] pt-[26px] pb-[22px] text-white will-change-transform"
          >
            <span className="pointer-events-none absolute top-1/2 left-[-10px] h-5 w-5 -translate-y-1/2 rounded-full bg-[#F5F6FA]" />
            <span className="pointer-events-none absolute top-1/2 right-[-10px] h-5 w-5 -translate-y-1/2 rounded-full bg-[#F5F6FA]" />

            <div className="mb-4 flex items-start justify-between border-b border-dashed border-white/20 pb-4">
              <div>
                <div
                  className={cn(zilla.className, "text-[19px] font-semibold")}
                >
                  Senior Backend Engineer
                </div>
                <div className="mt-0.5 text-[13px] text-[#AEB4CE]">
                  Client · Nimbus Health
                </div>
              </div>
              <div className="rounded-full bg-[rgba(227,167,59,0.18)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.03em] whitespace-nowrap text-[#E3A73B]">
                Placed
              </div>
            </div>

            <div className="mb-[18px] flex flex-col gap-3.5">
              <LedgerStep active>Role opened by client</LedgerStep>
              <LedgerStep active>You referred a candidate</LedgerStep>
              <LedgerStep active>Client interviewed &amp; hired</LedgerStep>
              <LedgerStep>Payout released to you</LedgerStep>
            </div>

            <div className="flex items-baseline justify-between rounded-[10px] bg-white/[0.06] px-4 py-3.5">
              <span className="text-xs text-[#AEB4CE]">Your placement fee</span>
              <span
                ref={feeRef}
                className={cn(
                  zilla.className,
                  "text-[26px] font-semibold text-[#E3A73B]",
                )}
              >
                INR 0
              </span>
            </div>
          </div>
        </section>

        <section className="mb-[70px] grid overflow-hidden rounded-[14px] border border-[#E2E4EE] bg-[#E2E4EE] md:grid-cols-3 md:gap-px">
          <ValueCell
            tag="For Talent Partners"
            title="Earn without the BD grind"
            body="No prospecting, no client calls, no chasing invoices. Refer candidates into roles that are already sold — the platform handles the rest."
            titleClassName={zilla.className}
          />
          <ValueCell
            tag="For Clients"
            title="Vetted talent, sourced fast"
            body="A network of specialist partners sources and screens candidates for your open roles, with one point of contact and one contract."
            titleClassName={zilla.className}
          />
          <ValueCell
            tag="Always On"
            title="Every status, always visible"
            body="Track each role from opening to offer to payout. No spreadsheets, no guessing where a placement — or a payment — stands."
            titleClassName={zilla.className}
          />
        </section>
      </div>
    </main>
  );
}

function LedgerStep({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      data-ledger-step
      className={cn(
        "flex items-center gap-3 text-[13.5px]",
        active ? "text-[#D6D9E8]" : "text-[#7B8099]",
      )}
    >
      <span
        data-pulse-dot={active ? "true" : undefined}
        className={cn(
          "h-2 w-2 shrink-0 rounded-full will-change-transform",
          active ? "bg-[#E3A73B]" : "bg-[#3A4066]",
        )}
      />
      {children}
    </div>
  );
}

function ValueCell({
  tag,
  title,
  body,
  titleClassName,
}: {
  tag: string;
  title: string;
  body: string;
  titleClassName: string;
}) {
  return (
    <motion.div
      data-reveal="value"
      className="bg-white px-[26px] py-7"
      whileHover={{ backgroundColor: "#FAFBFF" }}
      whileTap={{ scale: 0.992 }}
      transition={springs.press}
    >
      <span className="mb-2.5 inline-block text-[11px] font-semibold tracking-[0.05em] text-[#8A5D14] uppercase">
        {tag}
      </span>
      <h3 className={cn(titleClassName, "mb-2 text-[19px] font-semibold")}>
        {title}
      </h3>
      <p className="text-sm leading-[1.55] text-[#5B5F73]">{body}</p>
    </motion.div>
  );
}
