import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { auth } from "@clerk/nextjs/server";

import { AppProviders } from "@/components/providers/app-providers";
import { getAppSession } from "@/lib/auth";
import {
  APP_BRAND_MARK,
  APP_NAME,
  APP_TAGLINE,
  BRAND_LOGO_PATH,
} from "@/lib/constants";

import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://www.ovato.ai";

const sans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_BRAND_MARK}`,
  },
  description: `${APP_BRAND_MARK} ${APP_TAGLINE} — referral-led hiring platform`,
  applicationName: APP_BRAND_MARK,
  icons: {
    icon: [{ url: BRAND_LOGO_PATH, type: "image/png" }],
    apple: BRAND_LOGO_PATH,
    shortcut: BRAND_LOGO_PATH,
  },
  openGraph: {
    type: "website",
    siteName: APP_BRAND_MARK,
    title: APP_NAME,
    description: `${APP_BRAND_MARK} ${APP_TAGLINE} — referral-led hiring platform`,
    images: [
      {
        url: BRAND_LOGO_PATH,
        width: 113,
        height: 109,
        alt: `${APP_BRAND_MARK} ${APP_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: `${APP_BRAND_MARK} ${APP_TAGLINE} — referral-led hiring platform`,
    images: [BRAND_LOGO_PATH],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only resolve Airtable identity when Clerk has a user — avoids
  // unnecessary CRM calls (and failure modes) on public/sign-in pages.
  const { userId } = await auth();
  let session = null;

  if (userId) {
    try {
      session = await getAppSession();
    } catch {
      session = null;
    }
  }

  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased`}
      >
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
