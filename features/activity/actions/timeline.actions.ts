"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { requireAuth } from "@/lib/auth";
import {
  getEntityTimeline,
  getGlobalTimeline,
} from "@/features/activity/services";
import type {
  TimelineEntityRef,
  TimelineListFilters,
  TimelineListResult,
} from "@/features/activity/types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function loadGlobalTimelinePageAction(
  filters: TimelineListFilters,
): Promise<ActionResult<TimelineListResult>> {
  try {
    const session = await requireAuth();
    const result = await getGlobalTimeline(session, filters);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load timeline"),
    };
  }
}

export async function loadEntityTimelinePageAction(
  ref: TimelineEntityRef,
  filters: TimelineListFilters = {},
): Promise<ActionResult<TimelineListResult>> {
  try {
    const session = await requireAuth();
    const result = await getEntityTimeline(session, ref, filters);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load timeline"),
    };
  }
}
