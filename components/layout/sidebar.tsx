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
        "hidden h-[calc(100vh-4.5rem)] shrink-0 border-r border-[#E2E8F0] bg-white md:flex md:flex-col",
        collapsed ? "w-20" : "w-[260px]",
        className,
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
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
