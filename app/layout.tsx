import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@clerk/nextjs/server";

import { AppProviders } from "@/components/providers/app-providers";
import { getAppSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "Recruitment Partner Management System",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
