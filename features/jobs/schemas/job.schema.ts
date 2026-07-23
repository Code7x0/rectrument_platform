import { z } from "zod";

export const jobStatusSchema = z.enum([
  "open",
  "on_hold",
  "closed",
  "cancelled",
  "filled",
  "archived",
]);

export const jobPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
]);

export const jobFormSchema = z.object({
  title: z.string().trim().min(2, "Job title is required"),
  clientId: z.string().min(1, "Client is required"),
  accountManagerId: z
    .string()
    .min(1, "Assigned Account Manager is required"),
  hiringManager: z.string().trim().optional(),
  description: z.string().trim().optional(),
  location: z.string().trim().optional(),
  employmentType: employmentTypeSchema.optional(),
  experience: z.string().trim().optional(),
  salary: z.string().trim().optional(),
  priority: jobPrioritySchema.optional(),
  openPositions: z.coerce.number().int().min(1, "At least 1 position"),
  skills: z.string().trim().optional(),
  status: jobStatusSchema,
  notes: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const jobListFiltersSchema = z.object({
  search: z.string().optional(),
  status: jobStatusSchema.or(z.literal("all")).optional(),
  clientId: z.string().optional(),
  priority: jobPrioritySchema.or(z.literal("all")).optional(),
  location: z.string().optional(),
  employmentType: employmentTypeSchema.or(z.literal("all")).optional(),
  includeArchived: z.coerce.boolean().optional(),
});
