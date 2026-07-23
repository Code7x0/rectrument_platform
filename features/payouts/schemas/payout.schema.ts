import { z } from "zod";

import {
  AM_PAYOUT_TRANSITIONS,
  ADMIN_PAYOUT_TRANSITIONS,
  type PayoutStatus,
} from "@/features/payouts/types";

export const payoutStatusSchema = z.enum([
  "not_eligible",
  "eligible",
  "processing",
  "paid",
  "completed",
]);

export const payoutCurrencySchema = z
  .string()
  .trim()
  .length(3, "Use a 3-letter currency code")
  .transform((v) => v.toUpperCase());

export const payoutAmountSchema = z.coerce
  .number()
  .min(0, "Amount cannot be negative")
  .max(99_999_999, "Amount is too large");

export const updatePayoutStatusSchema = z.object({
  payoutId: z.string().min(1),
  payoutStatus: payoutStatusSchema,
  amount: payoutAmountSchema.optional(),
  currency: payoutCurrencySchema.optional(),
  eligibleDate: z.string().optional(),
  paidDate: z.string().optional(),
  notes: z.string().trim().optional(),
});

export const updatePayoutNotesSchema = z.object({
  payoutId: z.string().min(1),
  notes: z.string().trim().max(2000),
});

export type UpdatePayoutStatusValues = z.infer<typeof updatePayoutStatusSchema>;
export type UpdatePayoutNotesValues = z.infer<typeof updatePayoutNotesSchema>;

export function requiresAmount(status: PayoutStatus): boolean {
  return status === "eligible" || status === "processing" || status === "paid";
}

export function getAllowedPayoutTransitions(
  from: PayoutStatus,
  role: "admin" | "account_manager",
): PayoutStatus[] {
  const map =
    role === "admin" ? ADMIN_PAYOUT_TRANSITIONS : AM_PAYOUT_TRANSITIONS;
  return [...map[from]];
}

export function isValidPayoutTransition(
  from: PayoutStatus,
  to: PayoutStatus,
  role: "admin" | "account_manager",
): boolean {
  return getAllowedPayoutTransitions(from, role).includes(to);
}
