import { z } from "zod";

export const identityVisibilitySchema = z.enum(["public", "private"]);

export const partnerRegistrationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(8, "Enter a valid phone").max(20),
  city: z.string().trim().min(1, "City is required").max(80),
  state: z.string().trim().min(1, "State is required").max(80),
  skills: z.string().trim().min(2, "List at least one skill").max(500),
  experience: z
    .string()
    .trim()
    .min(2, "Describe your experience")
    .max(1000),
  bankDetails: z.string().trim().max(500).optional().or(z.literal("")),
  identityVisibility: identityVisibilitySchema,
  agreementAccepted: z
    .boolean()
    .refine((value) => value === true, {
      message: "You must accept the partner agreement",
    }),
});

export type PartnerRegistrationValues = z.infer<
  typeof partnerRegistrationSchema
>;

export const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["admin", "account_manager"]),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export type InviteStaffValues = z.infer<typeof inviteStaffSchema>;

export const rejectPartnerSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(3, "Provide a rejection reason").max(1000),
});

export type RejectPartnerValues = z.infer<typeof rejectPartnerSchema>;

export const changeRoleSchema = z.object({
  userId: z.string().min(1),
  toRole: z.enum(["admin", "account_manager", "partner"]),
});

export type ChangeRoleValues = z.infer<typeof changeRoleSchema>;

export const updateIdentityVisibilitySchema = z.object({
  partnerId: z.string().min(1),
  identityVisibility: identityVisibilitySchema,
});

export type UpdateIdentityVisibilityValues = z.infer<
  typeof updateIdentityVisibilitySchema
>;
