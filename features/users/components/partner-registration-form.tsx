"use client";

import {
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
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
import {
  finalizePartnerRegistrationAction,
  registerTalentPartnerAction,
  uploadPartnerRegistrationDocumentAction,
} from "@/features/users/actions";
import {
  prepareSignupFile,
  SIGNUP_MAX_FILE_BYTES,
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
import { cn } from "@/lib/utils";

type DocKey = "resume" | "pan" | "aadhaar" | "agreement";

const DOC_FIELDS: Array<{ key: DocKey; label: string }> = [
  { key: "resume", label: "Resume" },
  { key: "pan", label: "PAN" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "agreement", label: "Signed Partner Agreement" },
];

export function PartnerRegistrationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    resume: null,
    pan: null,
    aadhaar: null,
    agreement: null,
  });
  const [fileError, setFileError] = useState<string | null>(null);

  const resumeRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);
  const refs: Record<DocKey, RefObject<HTMLInputElement | null>> = {
    resume: resumeRef,
    pan: panRef,
    aadhaar: aadhaarRef,
    agreement: agreementRef,
  };

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

  function readFile(key: DocKey): File | null {
    return refs[key].current?.files?.[0] ?? files[key];
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
    if (metaError) {
      return `${label}: ${metaError}`;
    }
    if (file.size > SIGNUP_MAX_FILE_BYTES) {
      return `${label} must be under 4 MB. Please use a smaller file.`;
    }
    return null;
  }

  function onSubmit(values: PartnerRegistrationValues) {
    const selected: Record<DocKey, File | null> = {
      resume: readFile("resume"),
      pan: readFile("pan"),
      aadhaar: readFile("aadhaar"),
      agreement: readFile("agreement"),
    };
    setFiles(selected);

    for (const field of DOC_FIELDS) {
      const err = validateSelectedFile(selected[field.key], field.label);
      if (err) {
        setFileError(err);
        toast.error(err);
        return;
      }
    }

    setFileError(null);

    startTransition(async () => {
      try {
        const profileData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          profileData.set(key, String(value));
        });

        const created = await registerTalentPartnerAction(profileData);
        if (!created?.success) {
          const message =
            created && "message" in created
              ? created.message
              : "Unable to submit registration";
          setFileError(message);
          toast.error(message);
          created && "errors" in created
            ? created.errors?.forEach((err) => toast.error(err))
            : null;
          return;
        }

        const { partnerId } = created.data;

        for (const field of DOC_FIELDS) {
          const original = selected[field.key]!;
          const prepared = await prepareSignupFile(original);
          if (prepared.size > SIGNUP_MAX_FILE_BYTES) {
            const message = `${field.label} is still too large after compression. Please upload a file under 4 MB.`;
            setFileError(message);
            toast.error(message);
            return;
          }

          const docData = new FormData();
          docData.set("partnerId", partnerId);
          docData.set("email", values.email);
          docData.set("documentType", field.key);
          docData.set("file", prepared);

          const uploaded = await uploadPartnerRegistrationDocumentAction(docData);
          if (!uploaded?.success) {
            const message =
              uploaded && "message" in uploaded
                ? uploaded.message
                : `Unable to upload ${field.label}`;
            setFileError(message);
            toast.error(message);
            return;
          }
        }

        const finalizeData = new FormData();
        finalizeData.set("partnerId", partnerId);
        finalizeData.set("email", values.email);
        finalizeData.set("experience", values.experience);
        finalizeData.set("skills", values.skills);
        finalizeData.set("identityVisibility", values.identityVisibility);
        const finalized = await finalizePartnerRegistrationAction(finalizeData);
        if (!finalized?.success) {
          // Profile + docs saved; don't block success UX on notification failure.
          console.error("[registration] finalize failed", finalized);
        }

        toast.success("Application submitted — pending approval");
        router.push("/register/success");
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
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
            <option value="public">Show my name to Account Managers</option>
          </Select>
        </Field>

        <section className="grid gap-4 sm:grid-cols-2">
          {DOC_FIELDS.map((field) => (
            <FileField
              key={field.key}
              label={field.label}
              inputRef={refs[field.key]}
              file={files[field.key]}
              onChange={(next) =>
                setFiles((current) => ({ ...current, [field.key]: next }))
              }
              required
            />
          ))}
        </section>
        <p className="text-xs text-[#64748B]">
          Allowed: PDF, DOC, DOCX, PNG, JPG — up to 4 MB per file. Each file
          uploads separately to Airtable.
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
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground shadow-xs transition-ui hover:bg-muted/60",
          )}
        >
          {file ? "Change file" : "Choose file"}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-[#64748B]">
          {file ? file.name : "No file chosen"}
        </span>
      </div>
    </div>
  );
}
