import { z } from "zod";

/** Fields a Talent Partner may update on their own profile. */
export const partnerSelfProfileSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  contactName: z.string().trim().optional(),
  /** Email is identity-bound — partners cannot change it from the profile form. */
  phone: z.string().trim().optional(),
  specialization: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PartnerSelfProfileValues = z.infer<typeof partnerSelfProfileSchema>;
