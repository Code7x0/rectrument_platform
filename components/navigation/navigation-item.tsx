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
  const dashboardRoots = ["/admin", "/account-manager", "/partner"];

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
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150",
        collapsed && "justify-center px-2",
        active
          ? "bg-[#EEF2FF] text-[#2563EB]"
          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed ? <span>{item.title}</span> : null}
    </Link>
  );
}
