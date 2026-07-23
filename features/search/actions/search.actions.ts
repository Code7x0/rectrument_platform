"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { requireAuth } from "@/lib/auth";
import { globalSearchSchema } from "@/features/search/schemas/search.schema";
import { globalSearch } from "@/features/search/services";
import type { GlobalSearchResponse } from "@/features/search/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function globalSearchAction(
  input: unknown,
): Promise<ActionResult<GlobalSearchResponse>> {
  try {
    const session = await requireAuth();
    const parsed = globalSearchSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid search request" };
    }
    const data = await globalSearch(session, parsed.data);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: actionErrorMessage(error, "Search failed"),
    };
  }
}
