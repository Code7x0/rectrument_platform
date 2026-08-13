"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { PartnerRegistrationForm } from "@/features/users/components";

export function RegisterPageClient() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F1F5F9] via-[#F8FAFC] to-white px-4 py-12 sm:px-6">
      <FadeIn>
        <PartnerRegistrationForm />
      </FadeIn>
    </main>
  );
}
