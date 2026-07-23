import { z } from "zod";

export const candidateFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(7, "Phone is required"),
  currentCompany: z.string().trim().optional(),
  currentLocation: z.string().trim().optional(),
  experience: z.string().trim().optional(),
  currentCtc: z.string().trim().optional(),
  expectedCtc: z.string().trim().optional(),
  noticePeriod: z.string().trim().optional(),
  skills: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const candidateLookupSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});
