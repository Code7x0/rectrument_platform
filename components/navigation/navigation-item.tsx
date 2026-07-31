"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface NavigationItemProps {
  item: AppNavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function isNavItemActive(pathname: string, href: string): boolean {
  const dashboardRoots = [
    "/super-admin",
    "/admin",
    "/account-manager",
    "/partner",
  ];

  if (dashboardRoots.includes(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationItem({
  item,
  collapsed = false,
  onNavigate,
}: NavigationItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isNavItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.title : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-ui",
        collapsed && "justify-center px-2",
        active
          ? "bg-accent text-accent-foreground shadow-xs"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-[1.125rem] w-[1.125rem] shrink-0 transition-ui",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );
}
