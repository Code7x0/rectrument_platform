"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { ClientErrorBoundary } from "@/components/providers/client-error-boundary";
import type { Notification } from "@/features/notifications/types";
import { SearchProvider } from "@/features/search/components/search-provider";
import { getNavigationForRole } from "@/lib/navigation";
import type { UserRole } from "@/types";

const COLLAPSE_STORAGE_KEY = "rpms.sidebar.collapsed";

interface DashboardShellProps {
  children: ReactNode;
  /** Resolve nav icons on the client — icon components cannot cross the RSC boundary. */
  role: UserRole;
  notificationUnreadCount?: number;
  recentNotifications?: Notification[];
}

export function DashboardShell({
  children,
  role,
  notificationUnreadCount = 0,
  recentNotifications = [],
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavigationForRole(role);

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
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <ClientErrorBoundary>{children}</ClientErrorBoundary>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}
