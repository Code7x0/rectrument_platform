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
  accountManagerId: z.string().optional().default(""),
  hiringManager: z.string().trim().optional(),
  /**
   * Legacy Airtable jobs often only have a JD attachment / Comments notes.
   * Do not block create/edit when text fields were never filled.
   */
  description: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().optional().or(z.literal("")),
  employmentType: employmentTypeSchema.optional().default("full_time"),
  experience: z.string().trim().optional().or(z.literal("")),
  salary: z.string().trim().optional().or(z.literal("")),
  priority: jobPrioritySchema.optional().default("medium"),
  openPositions: z.coerce.number().int().min(1, "At least 1 position").default(1),
  skills: z.string().trim().optional(),
  status: jobStatusSchema,
  notes: z.string().trim().optional(),
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
