import { z } from "zod";

export const globalSearchSchema = z.object({
  query: z.string().trim().max(120),
  filter: z
    .enum([
      "all",
      "clients",
      "jobs",
      "partners",
      "candidates",
      "documents",
      "payouts",
      "activities",
      "notifications",
      "settings",
    ])
    .default("all"),
  mode: z.enum(["modal", "page"]).default("modal"),
});

export type GlobalSearchValues = z.infer<typeof globalSearchSchema>;
