import { z } from "zod";

export const allocationStatusSchema = z.enum([
  "assigned",
  "working",
  "completed",
  "cancelled",
  "archived",
]);

/**
 * Allocate Partner form — always bound to an existing Job.
 * jobId is supplied by the Jobs row action, not the user.
 * partnerIds supports assigning multiple talent partners in one submit.
 */
export const allocatePartnerFormSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  partnerIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one talent partner"),
  expectedProfiles: z.coerce
    .number()
    .int()
    .min(1, "Expected profiles must be at least 1"),
  assignedDate: z.string().min(1, "Assigned date is required"),
  notes: z.string().trim().optional(),
  status: allocationStatusSchema,
});

export type AllocatePartnerFormValues = z.infer<
  typeof allocatePartnerFormSchema
>;

export const updateAllocationFormSchema = z.object({
  expectedProfiles: z.coerce
    .number()
    .int()
    .min(1, "Expected profiles must be at least 1"),
  assignedDate: z.string().min(1, "Assigned date is required"),
  notes: z.string().trim().optional(),
  status: allocationStatusSchema,
});

export type UpdateAllocationFormValues = z.infer<
  typeof updateAllocationFormSchema
>;

export const allocationListFiltersSchema = z.object({
  search: z.string().optional(),
  status: allocationStatusSchema.or(z.literal("all")).optional(),
  partnerId: z.string().optional(),
  jobId: z.string().optional(),
  includeArchived: z.coerce.boolean().optional(),
});
