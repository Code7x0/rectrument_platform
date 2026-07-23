"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  archiveNotificationAction,
  deleteNotificationAction,
  listNotificationsPageAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import type {
  Notification,
  NotificationCategory,
  NotificationReadStatus,
} from "@/features/notifications/types";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "@/features/notifications/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotificationsPageClientProps {
  initialItems: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  hasMore: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function NotificationsPageClient({
  initialItems,
  unreadCount: initialUnread,
  total,
  page,
  hasMore,
  breadcrumbs,
}: NotificationsPageClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<NotificationReadStatus | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    NotificationCategory | "all"
  >("all");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(page);
  const [canLoadMore, setCanLoadMore] = useState(hasMore);
  const [listTotal, setListTotal] = useState(total);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!showArchived && item.archived) {
        return false;
      }
      if (showArchived && !item.archived) {
        return false;
      }
      if (readFilter !== "all" && item.readStatus !== readFilter) {
        return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false);
        if (!matches) {
          return false;
        }
      }
      return true;
    });
  }, [items, search, readFilter, categoryFilter, showArchived]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aPin = a.priority === "critical" && a.readStatus === "unread" ? 0 : 1;
      const bPin = b.priority === "critical" && b.readStatus === "unread" ? 0 : 1;
      if (aPin !== bPin) {
        return aPin - bPin;
      }
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [filtered]);

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Notifications"
        description="Your communication center — open related work in one click."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/notifications/preferences">Preferences</Link>
            </Button>
            <Button
              disabled={pending || unreadCount === 0}
              onClick={() => {
                startTransition(async () => {
                  const result = await markAllNotificationsReadAction();
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  setItems((current) =>
                    current.map((row) => ({
                      ...row,
                      readStatus: "read" as const,
                    })),
                  );
                  setUnreadCount(0);
                  toast.success(`Marked ${result.data.count} as read`);
                  router.refresh();
                });
              }}
            >
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search notifications"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={readFilter}
          onChange={(e) =>
            setReadFilter(e.target.value as NotificationReadStatus | "all")
          }
        >
          <option value="all">All read states</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as NotificationCategory | "all")
          }
        >
          <option value="all">All categories</option>
          {Object.entries(NOTIFICATION_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={showArchived ? "archived" : "active"}
          onChange={(e) => setShowArchived(e.target.value === "archived")}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <p className="mb-3 text-xs text-[#94A3B8]">
        Showing {sorted.length} of {listTotal} · {unreadCount} unread · page{" "}
        {currentPage}
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="When something needs your attention, it will appear here."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {sorted.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-2xl border border-[#E2E8F0] bg-white p-4 transition hover:shadow-sm",
                item.readStatus === "unread" && "border-[#BFDBFE] bg-[#F8FAFC]",
                item.priority === "critical" &&
                  item.readStatus === "unread" &&
                  "border-[#FECACA] bg-[#FEF2F2]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      {item.title}
                    </h3>
                    <Badge variant="secondary">
                      {NOTIFICATION_TYPE_LABELS[item.type]}
                    </Badge>
                    <Badge variant="outline">
                      {NOTIFICATION_PRIORITY_LABELS[item.priority]}
                    </Badge>
                    {item.readStatus === "unread" ? (
                      <Badge>Unread</Badge>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[#475569]">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    {NOTIFICATION_CATEGORY_LABELS[item.category]}
                    {item.createdAt
                      ? ` · ${formatDateTime(item.createdAt)}`
                      : ""}
                    {item.activityId ? ` · Activity ${item.activityId}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.actionUrl ? (
                    <Button asChild size="sm">
                      <Link
                        href={item.actionUrl}
                        onClick={() => {
                          if (item.readStatus === "unread") {
                            void markNotificationReadAction(item.id);
                          }
                        }}
                      >
                        Open
                      </Link>
                    </Button>
                  ) : null}
                  {item.readStatus === "unread" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await markNotificationReadAction(
                            item.id,
                          );
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? { ...row, readStatus: "read" as const }
                                : row,
                            ),
                          );
                          setUnreadCount((count) => Math.max(0, count - 1));
                        });
                      }}
                    >
                      Mark read
                    </Button>
                  ) : null}
                  {!item.archived ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await archiveNotificationAction(
                            item.id,
                          );
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? { ...row, archived: true }
                                : row,
                            ),
                          );
                          toast.success("Archived");
                        });
                      }}
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteNotificationAction(
                            item.id,
                          );
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          setItems((current) =>
                            current.filter((row) => row.id !== item.id),
                          );
                          toast.success("Removed");
                        });
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canLoadMore ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const nextPage = currentPage + 1;
                const result = await listNotificationsPageAction({
                  page: nextPage,
                  pageSize: 40,
                  archived: "all",
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                setItems((current) => {
                  const seen = new Set(current.map((row) => row.id));
                  return [
                    ...current,
                    ...result.data.items.filter((row) => !seen.has(row.id)),
                  ];
                });
                setCurrentPage(result.data.page);
                setCanLoadMore(result.data.hasMore);
                setListTotal(result.data.total);
                setUnreadCount(result.data.unreadCount);
              });
            }}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </ContentContainer>
  );
}
