import { z } from "zod";

export const clientStatusSchema = z.enum(["active", "inactive", "archived"]);

export const clientFormSchema = z.object({
  name: z.string().trim().min(2, "Client name is required"),
  industry: z.string().trim().optional(),
  website: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  primaryContact: z.string().trim().optional(),
  accountManagerId: z.string().optional(),
  status: clientStatusSchema.default("active"),
  notes: z.string().trim().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
