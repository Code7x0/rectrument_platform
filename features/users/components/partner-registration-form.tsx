"use client";

import { useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
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
  prepareSignupFiles,
  SIGNUP_MAX_TOTAL_BYTES,
} from "@/features/users/lib/prepare-signup-files";
import {
  partnerRegistrationSchema,
  type PartnerRegistrationValues,
} from "@/features/users/schemas/users.schema";
import { APP_NAME } from "@/lib/constants";
import {
  DOCUMENT_ACCEPT,
  validateDocumentUploadMeta,
} from "@/lib/files/document-types";

export function PartnerRegistrationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const resumeRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

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

  function readFile(
    ref: RefObject<HTMLInputElement | null>,
    fallback: File | null,
  ): File | null {
    return ref.current?.files?.[0] ?? fallback;
  }

  function validateSelectedFile(file: File | null, label: string): string | null {
    if (!file || file.size <= 0) {
      return `${label} is required`;
    }
    const metaError = validateDocumentUploadMeta({
      filename: file.name || label,
      contentType: file.type,
      size: file.size,
    });
    return metaError ? `${label}: ${metaError}` : null;
  }

  function onSubmit(values: PartnerRegistrationValues) {
    // Prefer live input files over React state (mobile browsers can desync).
    const resume = readFile(resumeRef, resumeFile);
    const pan = readFile(panRef, panFile);
    const aadhaar = readFile(aadhaarRef, aadhaarFile);
    const agreement = readFile(agreementRef, agreementFile);

    setResumeFile(resume);
    setPanFile(pan);
    setAadhaarFile(aadhaar);
    setAgreementFile(agreement);

    const missing =
      validateSelectedFile(resume, "Resume") ||
      validateSelectedFile(pan, "PAN") ||
      validateSelectedFile(aadhaar, "Aadhaar") ||
      validateSelectedFile(agreement, "Signed Partner Agreement");

    if (missing) {
      setFileError(missing);
      toast.error(missing);
      return;
    }

    setFileError(null);

    startTransition(async () => {
      try {
        const prepared = await prepareSignupFiles({
          resume: resume!,
          pan: pan!,
          aadhaar: aadhaar!,
          agreement: agreement!,
        });

        if (prepared.totalBytes > SIGNUP_MAX_TOTAL_BYTES) {
          const message =
            "Combined files are too large to upload. Please use smaller images or PDFs (under ~1 MB each) and try again.";
          setFileError(message);
          toast.error(message);
          return;
        }

        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          formData.set(key, String(value));
        });
        formData.set("resume", prepared.resume);
        formData.set("pan", prepared.pan);
        formData.set("aadhaar", prepared.aadhaar);
        formData.set("agreement", prepared.agreement);

        const result = await registerTalentPartnerAction(formData);
        if (!result || typeof result !== "object" || !("success" in result)) {
          const message =
            "Upload failed (files may be too large). Try smaller PDFs or images and submit again.";
          setFileError(message);
          toast.error(message);
          return;
        }
        if (!result.success) {
          toast.error(result.message);
          result.errors?.forEach((err) => toast.error(err));
          setFileError(result.message);
          return;
        }

        toast.success("Application submitted — pending approval");
        router.push("/register/success");
      } catch (error) {
        const message =
          error instanceof Error && /body|413|too large|fetch/i.test(error.message)
            ? "Upload failed because the files are too large. Please use smaller PDFs or images and try again."
            : error instanceof Error && error.message.trim()
              ? error.message
              : "Unable to submit registration. Please try again.";
        setFileError(message);
        toast.error(message);
      }
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
        {fileError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {fileError}
          </p>
        ) : null}

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
          <Textarea
            rows={2}
            placeholder="Account holder, bank name, account number, IFSC"
            {...form.register("bankDetails")}
          />
        </Field>

        <Field
          label="Name visibility to Account Managers"
          error={form.formState.errors.identityVisibility?.message}
        >
          <Select {...form.register("identityVisibility")}>
            <option value="private">
              Keep my name private (managers see Partner ID only)
            </option>
            <option value="public">
              Show my name to Account Managers
            </option>
          </Select>
        </Field>

        <section className="grid gap-4 sm:grid-cols-2">
          <FileField
            label="Resume"
            inputRef={resumeRef}
            file={resumeFile}
            onChange={setResumeFile}
            required
          />
          <FileField
            label="PAN"
            inputRef={panRef}
            file={panFile}
            onChange={setPanFile}
            required
          />
          <FileField
            label="Aadhaar"
            inputRef={aadhaarRef}
            file={aadhaarFile}
            onChange={setAadhaarFile}
            required
          />
          <FileField
            label="Signed Partner Agreement"
            inputRef={agreementRef}
            file={agreementFile}
            onChange={setAgreementFile}
            required
          />
        </section>
        <p className="text-xs text-[#64748B]">
          Allowed: PDF, DOC, DOCX, PNG, JPG. Photos are compressed automatically.
          Keep each file under ~2 MB when possible.
        </p>

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
  children: ReactNode;
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
  inputRef,
  file,
  onChange,
  required,
}: {
  label: string;
  inputRef: RefObject<HTMLInputElement | null>;
  file: File | null;
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
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <p className="truncate text-xs text-[#64748B]">{file.name}</p>
      ) : null}
    </div>
  );
}
