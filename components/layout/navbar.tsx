"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { RoleBadge } from "@/components/shared/role-badge";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { Notification } from "@/features/notifications/types";
import { SearchTrigger } from "@/features/search/components/search-trigger";
import { useCurrentUser } from "@/hooks/use-current-user";
import { APP_NAME } from "@/lib/constants";
import type { AppNavItem } from "@/lib/navigation";

interface NavbarProps {
  items: AppNavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  notificationUnreadCount?: number;
  recentNotifications?: Notification[];
}

export function Navbar({
  items,
  collapsed,
  onToggleCollapsed,
  notificationUnreadCount = 0,
  recentNotifications = [],
}: NavbarProps) {
  const { role } = useCurrentUser();
  const { user } = useUser();

  const displayName =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Signed in user";

  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 lg:px-6">
      <MobileSidebar items={items} />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </Button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#0F172A]">
          {APP_NAME}
        </p>
      </div>

      <div className="ml-2 hidden max-w-md flex-1 items-center md:flex">
        <SearchTrigger />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <SearchTrigger variant="icon" />

        <NotificationBell
          initialUnreadCount={notificationUnreadCount}
          recent={recentNotifications}
        />

        <div className="hidden items-center gap-2 sm:flex">
          <div className="text-right">
            <p className="max-w-[140px] truncate text-sm font-medium text-[#0F172A]">
              {displayName}
            </p>
            {role ? <RoleBadge role={role} /> : null}
          </div>
        </div>

        {role ? (
          <div className="sm:hidden">
            <RoleBadge role={role} />
          </div>
        ) : null}

        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
        />
      </div>
    </header>
  );
}
