import { z } from "zod";

/** Fields a Talent Partner may update on their own profile. */
export const partnerSelfProfileSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  contactName: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional(),
  specialization: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PartnerSelfProfileValues = z.infer<typeof partnerSelfProfileSchema>;
