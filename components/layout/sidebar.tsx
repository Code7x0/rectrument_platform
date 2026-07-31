"use client";

import type { AppNavItem } from "@/lib/navigation";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { cn } from "@/lib/utils";

interface SidebarProps {
  items: AppNavItem[];
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({
  items,
  collapsed = false,
  className,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-[calc(100vh-3.75rem)] shrink-0 border-r border-border bg-card md:flex md:flex-col",
        collapsed ? "w-[4.5rem]" : "w-[15.5rem]",
        className,
      )}
    >
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {items.map((item) => (
          <NavigationItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
}
