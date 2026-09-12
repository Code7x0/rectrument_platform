"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkSignInEligibilityAction } from "@/lib/auth/check-sign-in-eligibility";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type EmailOtpSignInProps = {
  completeRedirectUrl?: string;
  className?: string;
  /** Compact nav row vs stacked CTA block. */
  layout?: "inline" | "stacked";
  /** Visual treatment for dark landing page. */
  tone?: "light" | "dark";
};

function isMissingClerkAccountError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as {
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
    message?: string;
  };
  const first = err.errors?.[0];
  const text = [
    first?.code,
    first?.message,
    first?.longMessage,
    err.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    first?.code === "form_identifier_not_found" ||
    text.includes("couldn't find your account") ||
    text.includes("could not find your account")
  );
}

function clerkErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Unable to sign in with email. Try again.";
  }
  const err = error as {
    errors?: Array<{ longMessage?: string; message?: string; code?: string }>;
    message?: string;
  };
  const first = err.errors?.[0];
  const detail =
    first?.longMessage || first?.message || err.message || first?.code;
  if (detail?.trim()) {
    return detail.trim();
  }
  return "Unable to sign in with email. Try again.";
}

export function EmailOtpSignIn({
  completeRedirectUrl = ROUTES.authCallback,
  className,
  layout = "stacked",
  tone = "light",
}: EmailOtpSignInProps) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [pending, setPending] = useState(false);
  const isLoaded = signInLoaded && signUpLoaded;

  const dark = tone === "dark";
  const inputClass = dark
    ? "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[#F6F4FF] placeholder:text-[#A7A2D6]"
    : undefined;
  const buttonGhostClass = dark
    ? "border-[rgba(255,255,255,0.18)] bg-transparent text-[#F6F4FF] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F6F4FF]"
    : undefined;

  async function startSignUpOtp(normalized: string) {
    if (!signUp) {
      throw new Error("Sign-up is not ready. Refresh and try again.");
    }
    const eligibility = await checkSignInEligibilityAction(normalized);
    if (!eligibility.ok) {
      toast.error(eligibility.message);
      return;
    }

    await signUp.create({ emailAddress: normalized });
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    setFlow("signUp");
    setStep("code");
    toast.message("Check your email for the verification code");
  }

  async function sendCode() {
    if (!signIn || !isLoaded) {
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("Enter your email address");
      return;
    }

    setPending(true);
    try {
      const created = await signIn.create({ identifier: normalized });
      const emailFactor = created.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error(
          "Email sign-in is not enabled for this address. Try Google sign-in or contact support.",
        );
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setFlow("signIn");
      setStep("code");
      toast.message("Check your email for the sign-in code");
    } catch (error) {
      if (isMissingClerkAccountError(error)) {
        try {
          await startSignUpOtp(normalized);
          return;
        } catch (signUpError) {
          console.error("[auth] email OTP sign-up fallback failed", signUpError);
          toast.error(clerkErrorMessage(signUpError));
          return;
        }
      }
      console.error("[auth] email OTP send failed", error);
      toast.error(clerkErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    if (!isLoaded) {
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Enter the code from your email");
      return;
    }

    setPending(true);
    try {
      if (flow === "signUp") {
        if (!signUp) {
          throw new Error("Sign-up is not ready. Refresh and try again.");
        }
        const result = await signUp.attemptEmailAddressVerification({
          code: trimmed,
        });
        if (result.status !== "complete") {
          throw new Error("Sign-up could not be completed. Try again.");
        }
        if (!result.createdSessionId) {
          throw new Error("Sign-up session was not created. Try again.");
        }
        await setActive({ session: result.createdSessionId });
        router.replace(completeRedirectUrl);
        return;
      }

      if (!signIn) {
        throw new Error("Sign-in is not ready. Refresh and try again.");
      }
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: trimmed,
      });
      if (result.status !== "complete") {
        throw new Error("Sign-in could not be completed. Try again.");
      }
      if (!result.createdSessionId) {
        throw new Error("Sign-in session was not created. Try again.");
      }
      await setActive({ session: result.createdSessionId });
      router.replace(completeRedirectUrl);
    } catch (error) {
      console.error("[auth] email OTP verify failed", error);
      toast.error(clerkErrorMessage(error));
      setPending(false);
    }
  }

  const fields =
    step === "email" ? (
      <>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn(inputClass, layout === "inline" ? "min-w-[220px]" : "")}
          disabled={pending || !isLoaded}
        />
        <Button
          type="button"
          variant={dark ? "outline" : "secondary"}
          className={cn(buttonGhostClass, layout === "inline" ? "shrink-0" : "w-full")}
          disabled={pending || !isLoaded}
          onClick={() => void sendCode()}
        >
          {pending ? "Sending…" : "Email me a code"}
        </Button>
      </>
    ) : (
      <>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={cn(inputClass, layout === "inline" ? "min-w-[160px]" : "")}
          disabled={pending || !isLoaded}
        />
        <Button
          type="button"
          className={layout === "inline" ? "shrink-0" : "w-full"}
          disabled={pending || !isLoaded}
          onClick={() => void verifyCode()}
        >
          {pending ? "Verifying…" : "Verify & sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            dark ? "text-[#A7A2D6] hover:bg-transparent hover:text-[#F6F4FF]" : "",
            layout === "inline" ? "shrink-0 px-2" : "w-full",
          )}
          disabled={pending}
          onClick={() => {
            setStep("email");
            setCode("");
            setFlow("signIn");
          }}
        >
          Change email
        </Button>
      </>
    );

  return (
    <div
      className={cn(
        layout === "inline"
          ? "flex flex-wrap items-center gap-2"
          : "flex w-full max-w-sm flex-col gap-2",
        className,
      )}
    >
      {fields}
    </div>
  );
}
