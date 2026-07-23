import { z } from "zod";

export const notificationChannelSchema = z.enum([
  "in_app",
  "email",
  "both",
  "none",
]);

export const notificationCategorySchema = z.enum([
  "jobs",
  "candidates",
  "payouts",
  "documents",
  "system",
  "security",
  "role_changes",
]);

export const updatePreferencesSchema = z.object({
  defaultChannel: notificationChannelSchema.optional(),
  categories: z
    .record(notificationCategorySchema, notificationChannelSchema)
    .optional(),
});

export type UpdatePreferencesValues = z.infer<typeof updatePreferencesSchema>;

export const notificationListQuerySchema = z.object({
  readStatus: z.enum(["unread", "read", "all"]).optional(),
  archived: z.enum(["true", "false", "all"]).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});
