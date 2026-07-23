import { z } from "zod";

export const partnerStatusSchema = z.enum([
  "active",
  "inactive",
  "pending",
  "archived",
]);

export const partnerVerificationSchema = z.enum([
  "pending",
  "verified",
  "rejected",
]);

export const partnerFormSchema = z.object({
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
  revenueShare: z.string().trim().optional(),
  rating: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : undefined;
  }, z.number().min(0).max(5).optional()),
  status: partnerStatusSchema.default("pending"),
  verificationStatus: partnerVerificationSchema.default("pending"),
  notes: z.string().trim().optional(),
});

export type PartnerFormValues = z.infer<typeof partnerFormSchema>;
