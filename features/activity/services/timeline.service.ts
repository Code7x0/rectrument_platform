import { cache } from "react";

import { groupTimelineItems } from "@/features/activity/services/grouping";
import { toTimelineItem } from "@/features/activity/services/presenters";
import {
  activityMatchesAccess,
  resolveEntityAccessKeys,
  resolveViewerAccessKeys,
} from "@/features/activity/services/scope";
import type {
  TimelineEntityRef,
  TimelineListFilters,
  TimelineListResult,
} from "@/features/activity/types";
import {
  listActivities,
  listActivitiesForEntity,
} from "@/features/workflows/services/activity.service";
import type { Activity } from "@/features/workflows/types";
import { listUsers } from "@/services/users/users.service";
import type { AppSession, UserRole } from "@/types";

async function loadActorMap(): Promise<
  Map<string, { name: string; role: UserRole | null }>
> {
  try {
    const users = await listUsers();
    return new Map(
      users.map((user) => [
        user.id,
        { name: user.fullName, role: user.role },
      ]),
    );
  } catch {
    return new Map();
  }
}

function applyFilters(
  items: ReturnType<typeof toTimelineItem>[],
  filters: TimelineListFilters,
): ReturnType<typeof toTimelineItem>[] {
  let next = items;

  if (filters.entityType && filters.entityType !== "all") {
    next = next.filter((item) => item.entityType === filters.entityType);
  }
  if (filters.action && filters.action !== "all") {
    next = next.filter((item) => item.action === filters.action);
  }
  if (filters.actorUserId && filters.actorUserId !== "all") {
    next = next.filter((item) => item.actorUserId === filters.actorUserId);
  }
  if (filters.actorRole && filters.actorRole !== "all") {
    next = next.filter((item) => item.actorRole === filters.actorRole);
  }
  if (filters.fromDate) {
    const from = new Date(filters.fromDate).getTime();
    next = next.filter((item) => {
      if (!item.createdAt) {
        return false;
      }
      return new Date(item.createdAt).getTime() >= from;
    });
  }
  if (filters.toDate) {
    const to = new Date(filters.toDate).getTime();
    next = next.filter((item) => {
      if (!item.createdAt) {
        return false;
      }
      return new Date(item.createdAt).getTime() <= to;
    });
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    next = next.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.summary?.toLowerCase().includes(q) ?? false) ||
        (item.actorName?.toLowerCase().includes(q) ?? false) ||
        (item.note?.toLowerCase().includes(q) ?? false) ||
        item.entityLabel.toLowerCase().includes(q),
    );
  }

  // unreadOnly is future-ready — no-op until activities track read state.
  return next;
}

function paginate(
  items: ReturnType<typeof toTimelineItem>[],
  page: number,
  pageSize: number,
): TimelineListResult {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    groups: groupTimelineItems(pageItems),
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

function emptyResult(page: number, pageSize: number): TimelineListResult {
  return {
    items: [],
    groups: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
  };
}

async function enrichAndFilter(
  activities: Activity[],
  session: AppSession,
  filters: TimelineListFilters,
  access: Awaited<ReturnType<typeof resolveViewerAccessKeys>> | Set<string>,
): Promise<TimelineListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));
  const actors = await loadActorMap();

  const scoped = activities.filter((row) =>
    activityMatchesAccess(row.entityType, row.entityId, access),
  );

  const items = scoped.map((row) => toTimelineItem(row, session.role, actors));
  return paginate(applyFilters(items, filters), page, pageSize);
}

/**
 * Global Activity Timeline — role-scoped.
 */
export async function getGlobalTimeline(
  session: AppSession,
  filters: TimelineListFilters = {},
): Promise<TimelineListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

  try {
    const [access, activities] = await Promise.all([
      resolveViewerAccessKeys(session),
      listActivities({ maxRecords: 400 }),
    ]);
    return enrichAndFilter(activities, session, filters, access);
  } catch (error) {
    console.error("[activity] global timeline failed", error);
    return emptyResult(page, pageSize);
  }
}

/**
 * Entity-scoped timeline (workspace tab / drawer).
 */
export async function getEntityTimeline(
  session: AppSession,
  ref: TimelineEntityRef,
  filters: TimelineListFilters = {},
): Promise<TimelineListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 40));

  try {
    const [viewerAccess, entityKeys] = await Promise.all([
      resolveViewerAccessKeys(session),
      resolveEntityAccessKeys(ref),
    ]);

    if (entityKeys === "none") {
      return emptyResult(page, pageSize);
    }

    let activities: Activity[];
    if (
      entityKeys !== "all" &&
      entityKeys.size === 1 &&
      (ref.kind === "submission" ||
        ref.kind === "payout" ||
        ref.kind === "user" ||
        ref.kind === "partner_document" ||
        ref.kind === "document")
    ) {
      const entityType =
        ref.kind === "document" ? "partner_document" : ref.kind;
      activities = await listActivitiesForEntity(entityType, ref.id);
    } else {
      activities = await listActivities({ maxRecords: 400 });
    }

    const access =
      entityKeys === "all"
        ? viewerAccess
        : new Set(
            [...entityKeys].filter((key) => {
              if (viewerAccess === "all") {
                return true;
              }
              return viewerAccess.has(key);
            }),
          );

    return enrichAndFilter(activities, session, filters, access);
  } catch (error) {
    console.error("[activity] entity timeline failed", error);
    return emptyResult(page, pageSize);
  }
}

export const getCachedGlobalTimeline = cache(getGlobalTimeline);
