"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import type { Notification } from "@/features/notifications/types";
import { SearchProvider } from "@/features/search/components/search-provider";
import type { AppNavItem } from "@/lib/navigation";

const COLLAPSE_STORAGE_KEY = "rpms.sidebar.collapsed";

interface DashboardShellProps {
  children: ReactNode;
  navItems: AppNavItem[];
  notificationUnreadCount?: number;
  recentNotifications?: Notification[];
}

export function DashboardShell({
  children,
  navItems,
  notificationUnreadCount = 0,
  recentNotifications = [],
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  function handleToggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <SearchProvider>
      <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
        <Navbar
          items={navItems}
          collapsed={collapsed}
          onToggleCollapsed={handleToggleCollapsed}
          notificationUnreadCount={notificationUnreadCount}
          recentNotifications={recentNotifications}
        />
        <div className="flex flex-1">
          <Sidebar items={navItems} collapsed={collapsed} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
