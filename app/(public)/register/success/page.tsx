import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default function RegisterSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F8FAFC] p-8">
      <div className="max-w-md space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium tracking-wide text-[#64748B] uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-2xl font-semibold text-[#0F172A]">
          Application submitted
        </h1>
        <p className="text-sm text-[#64748B]">
          Your Talent Partner application is pending Admin review. You will
          receive an email when it is approved. You cannot sign in until then.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
