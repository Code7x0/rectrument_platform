import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "account_manager", "partner"]);

export const userStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const emailSchema = z.string().email();

export const clerkUserIdSchema = z.string().min(1);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idSchema = z.string().min(1);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
