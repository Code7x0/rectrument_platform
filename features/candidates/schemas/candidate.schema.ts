import { z } from "zod";

export const skillScreenSchema = z.object({
  skill: z.string().trim().optional().or(z.literal("")),
  years: z.string().trim().optional().or(z.literal("")),
  alternate: z.string().trim().optional().or(z.literal("")),
});

export type SkillScreenRow = z.infer<typeof skillScreenSchema>;

/**
 * Partner candidate submission + edit form.
 * Screening fields are optional; anything filled is written to Screening Matrix Notes.
 * AM coaching for the partner stays in Internal Feedback — do not mix the two.
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
  currentCompany: z.string().trim().optional().or(z.literal("")),
  experience: z.string().trim().optional().or(z.literal("")),
  skillScreens: z.array(skillScreenSchema).optional().default([]),
  remarks: z.string().trim().optional().or(z.literal("")),
  skills: z.string().trim().optional().or(z.literal("")),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const candidateLookupSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export function emptySkillScreen(): SkillScreenRow {
  return { skill: "", years: "", alternate: "" };
}
