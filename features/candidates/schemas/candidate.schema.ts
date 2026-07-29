import { z } from "zod";

/**
 * Partner candidate submission form — recruiter-minimal fields only.
 * Extra Airtable columns (company, skills, remarks, experience) stay unused
 * on create so the locked schema remains compatible.
 */
export const candidateFormSchema = z.object({
  fullName: z.string().trim().min(2, "Candidate name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(7, "Phone number is required"),
  currentLocation: z.string().trim().min(2, "Current location is required"),
  currentCtc: z.string().trim().optional().or(z.literal("")),
  expectedCtc: z.string().trim().optional().or(z.literal("")),
  noticePeriod: z.string().trim().min(1, "Notice period is required"),
  linkedIn: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) =>
        !value ||
        /^https?:\/\/(www\.)?linkedin\.com\/.+/i.test(value) ||
        /^linkedin\.com\/.+/i.test(value),
      "Enter a valid LinkedIn profile URL",
    ),
  // Kept optional for backend compatibility — not shown on the submit form.
  currentCompany: z.string().trim().optional(),
  experience: z.string().trim().optional(),
  skills: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const candidateLookupSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});
