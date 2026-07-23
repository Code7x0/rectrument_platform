"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { registerTalentPartnerAction } from "@/features/users/actions";
import {
  partnerRegistrationSchema,
  type PartnerRegistrationValues,
} from "@/features/users/schemas/users.schema";
import { APP_NAME } from "@/lib/constants";

export function PartnerRegistrationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const form = useForm<PartnerRegistrationValues>({
    resolver: zodResolver(partnerRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      skills: "",
      experience: "",
      bankDetails: "",
      identityVisibility: "private",
      agreementAccepted: false,
    },
  });

  function onSubmit(values: PartnerRegistrationValues) {
    if (!panFile || !aadhaarFile || !agreementFile) {
      toast.error("Upload PAN, Aadhaar, and signed Agreement");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        formData.set(key, String(value));
      });
      formData.set("pan", panFile);
      formData.set("aadhaar", aadhaarFile);
      formData.set("agreement", agreementFile);
      if (resumeFile) {
        formData.set("resume", resumeFile);
      }

      const result = await registerTalentPartnerAction(formData);
      if (!result.success) {
        toast.error(result.message);
        result.errors?.forEach((err) => toast.error(err));
        return;
      }

      toast.success("Application submitted — pending approval");
      router.push("/register/success");
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium tracking-wide text-[#64748B] uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">
          Become a Talent Partner
        </h1>
        <p className="text-sm text-[#64748B]">
          Submit your profile and documents. Access is granted only after Admin
          approval — you cannot sign in until then.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={form.formState.errors.firstName?.message}>
            <Input {...form.register("firstName")} autoComplete="given-name" />
          </Field>
          <Field label="Last name" error={form.formState.errors.lastName?.message}>
            <Input {...form.register("lastName")} autoComplete="family-name" />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} autoComplete="email" />
          </Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} autoComplete="tel" />
          </Field>
          <Field label="City" error={form.formState.errors.city?.message}>
            <Input {...form.register("city")} />
          </Field>
          <Field label="State" error={form.formState.errors.state?.message}>
            <Input {...form.register("state")} />
          </Field>
        </section>

        <Field label="Skills" error={form.formState.errors.skills?.message}>
          <Textarea
            rows={2}
            placeholder="e.g. Tech recruiting, BFSI, Mid-senior hiring"
            {...form.register("skills")}
          />
        </Field>

        <Field
          label="Experience"
          error={form.formState.errors.experience?.message}
        >
          <Textarea
            rows={3}
            placeholder="Years of experience and focus areas"
            {...form.register("experience")}
          />
        </Field>

        <Field
          label="Bank details (optional)"
          error={form.formState.errors.bankDetails?.message}
        >
          <Textarea rows={2} {...form.register("bankDetails")} />
        </Field>

        <Field
          label="Identity visibility"
          error={form.formState.errors.identityVisibility?.message}
        >
          <Select {...form.register("identityVisibility")}>
            <option value="private">Private — Account Managers see Partner ID only</option>
            <option value="public">Public — Account Managers see your name</option>
          </Select>
        </Field>

        <section className="grid gap-4 sm:grid-cols-2">
          <FileField
            label="Resume"
            onChange={setResumeFile}
            required={false}
          />
          <FileField label="PAN" onChange={setPanFile} required />
          <FileField label="Aadhaar" onChange={setAadhaarFile} required />
          <FileField
            label="Signed agreement"
            onChange={setAgreementFile}
            required
          />
        </section>

        <label className="flex items-start gap-3 text-sm text-[#334155]">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.watch("agreementAccepted")}
            onChange={(e) =>
              form.setValue("agreementAccepted", e.target.checked, {
                shouldValidate: true,
              })
            }
          />
          <span>
            I accept the Talent Partner agreement and confirm the documents
            uploaded are accurate.
            {form.formState.errors.agreementAccepted ? (
              <span className="mt-1 block text-xs text-red-600">
                {form.formState.errors.agreementAccepted.message}
              </span>
            ) : null}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit application"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function FileField({
  label,
  onChange,
  required,
}: {
  label: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
