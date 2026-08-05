import { z } from "zod";

export const clientStatusSchema = z.enum(["active", "inactive", "archived"]);

/** Exact Airtable Mode Of Work choice names (including trailing space on WFO). */
export const CLIENT_MODE_OF_WORK_OPTIONS = [
  { value: "WFO ", label: "WFO" },
  { value: "Hybrid - Few days in office", label: "Hybrid - Few days in office" },
  { value: "WFH - Anywhere", label: "WFH - Anywhere" },
  { value: "WFH - Stay Local", label: "WFH - Stay Local" },
  { value: "Role Based Decision", label: "Role Based Decision" },
] as const;

export const clientFormSchema = z.object({
  name: z.string().trim().min(2, "Client name is required"),
  industry: z.string().trim().min(1, "Industry is required"),
  website: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  primaryContact: z.string().trim().optional(),
  accountManagerId: z.string().optional(),
  status: clientStatusSchema.default("active"),
  primaryAddress: z.string().trim().optional(),
  modeOfWork: z.string().optional(),
  workDaysInWeek: z.union([
    z.coerce.number().int().min(0).max(7),
    z.literal(""),
  ]).optional(),
  notes: z.string().trim().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
