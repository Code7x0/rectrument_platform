"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import type { Notification } from "@/features/notifications/types";
import { NOTIFICATION_PRIORITY_LABELS } from "@/features/notifications/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  initialUnreadCount: number;
  recent: Notification[];
}

export function NotificationBell({
  initialUnreadCount,
  recent,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(recent);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(recent);
    setUnreadCount(initialUnreadCount);
  }, [recent, initialUnreadCount]);

  const pinned = useMemo(
    () =>
      items.filter(
        (item) => item.priority === "critical" && item.readStatus === "unread",
      ),
    [items],
  );
  const rest = useMemo(
    () =>
      items.filter(
        (item) =>
          !(item.priority === "critical" && item.readStatus === "unread"),
      ),
    [items],
  );

  function markRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setItems((current) =>
        current.map((row) =>
          row.id === id ? { ...row, readStatus: "read" as const } : row,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative rounded-xl"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5 text-[#64748B]" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notification center"
            className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  Notifications
                </p>
                <p className="text-xs text-[#64748B]">
                  {unreadCount} unread
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
                    router.refresh();
                  });
                }}
              >
                Mark all read
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#64748B]">
                  You&apos;re all caught up.
                </p>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {[...pinned, ...rest].map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-[#F8FAFC]",
                          item.readStatus === "unread" && "bg-[#F8FAFC]",
                        )}
                        onClick={() => {
                          if (item.readStatus === "unread") {
                            markRead(item.id);
                          }
                          setOpen(false);
                          if (item.actionUrl) {
                            router.push(item.actionUrl);
                          } else {
                            router.push("/notifications");
                          }
                        }}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-[#0F172A]">
                            {item.title}
                          </span>
                          {item.readStatus === "unread" ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                          ) : null}
                        </span>
                        {item.description ? (
                          <span className="line-clamp-2 text-xs text-[#64748B]">
                            {item.description}
                          </span>
                        ) : null}
                        <span className="text-[11px] text-[#94A3B8]">
                          {NOTIFICATION_PRIORITY_LABELS[item.priority]}
                          {item.createdAt
                            ? ` · ${formatDateTime(item.createdAt)}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-2">
              <Link
                href="/notifications"
                className="text-xs font-medium text-[#2563EB] hover:underline"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
              <Link
                href="/notifications/preferences"
                className="text-xs text-[#64748B] hover:underline"
                onClick={() => setOpen(false)}
              >
                Preferences
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
