import Link from "next/link";
import type { ReactNode } from "react";
import { Inter, Zilla_Slab } from "next/font/google";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getAppSession, getDashboardRouteForRole } from "@/lib/auth";
import { rethrowNextControlFlow } from "@/lib/actions/errors";
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

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    try {
      const session = await getAppSession();
      if (session && session.status === "active") {
        redirect(getDashboardRouteForRole(session.role));
      }
      redirect(ROUTES.unauthorized);
    } catch (error) {
      rethrowNextControlFlow(error);
      redirect(ROUTES.unauthorized);
    }
  }

  return (
    <main
      className={cn(
        inter.className,
        "min-h-screen bg-[#F5F6FA] text-[#14162B] antialiased",
      )}
    >
      <div className="mx-auto max-w-[1120px] px-6 sm:px-8">
        <header className="pt-7">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-[#8A5D14] uppercase">
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
              Refer talent.
              <br />
              Skip the chase.
              <br />
              <em className="not-italic text-[#8A5D14] [background-image:linear-gradient(transparent_62%,rgba(227,167,59,0.35)_0)]">
                Get paid.
              </em>
            </h1>
            <p className="mb-8 max-w-[520px] text-base leading-[1.55] text-[#5B5F73] md:text-lg">
              Live, pre‑sold roles come to you — we own the client relationship,
              the contract, and the invoice. You source, refer, and close, and
              earn a payout on every placement.
            </p>

            <div className="mb-[18px] flex flex-wrap gap-3">
              <GoogleSignInButton
                label="Sign in with Google"
                variant="outline"
                className="h-auto w-auto min-w-0 justify-center rounded-[9px] border-[1.5px] border-[#E2E4EE] bg-white px-[22px] py-[13px] text-[15px] font-semibold text-[#14162B] shadow-none hover:bg-white hover:text-[#14162B]"
              />
              <Link
                href={ROUTES.register}
                className="inline-flex items-center justify-center rounded-[9px] bg-[#14162B] px-[22px] py-[13px] text-[15px] font-semibold text-white no-underline"
              >
                Become a Talent Partner
              </Link>
            </div>

            <p className="max-w-[460px] text-[13px] leading-[1.5] text-[#5B5F73]">
              <span className="font-semibold text-[#14162B]">Staff</span> sign
              in by invitation only.{" "}
              <span className="font-semibold text-[#14162B]">
                Talent Partners
              </span>{" "}
              register publicly and unlock login once approved by an admin.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-[#1B2340] px-[26px] pt-[26px] pb-[22px] text-white">
            <span className="pointer-events-none absolute top-1/2 left-[-10px] h-5 w-5 -translate-y-1/2 rounded-full bg-[#F5F6FA]" />
            <span className="pointer-events-none absolute top-1/2 right-[-10px] h-5 w-5 -translate-y-1/2 rounded-full bg-[#F5F6FA]" />

            <div className="mb-4 flex items-start justify-between border-b border-dashed border-white/20 pb-4">
              <div>
                <div
                  className={cn(
                    zilla.className,
                    "text-[19px] font-semibold",
                  )}
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
                className={cn(
                  zilla.className,
                  "text-[26px] font-semibold text-[#E3A73B]",
                )}
              >
                $4,200
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
      className={cn(
        "flex items-center gap-3 text-[13.5px]",
        active ? "text-[#D6D9E8]" : "text-[#7B8099]",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
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
    <div className="bg-white px-[26px] py-7">
      <span className="mb-2.5 inline-block text-[11px] font-semibold tracking-[0.05em] text-[#8A5D14] uppercase">
        {tag}
      </span>
      <h3 className={cn(titleClassName, "mb-2 text-[19px] font-semibold")}>
        {title}
      </h3>
      <p className="text-sm leading-[1.55] text-[#5B5F73]">{body}</p>
    </div>
  );
}
