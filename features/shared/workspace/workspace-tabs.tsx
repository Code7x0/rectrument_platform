"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export interface WorkspaceTabItem {
  id: string;
  label: string;
  href: string;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activeTab: string;
  className?: string;
}

export function WorkspaceTabs({
  tabs,
  activeTab,
  className,
}: WorkspaceTabsProps) {
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 border-b border-[#E2E8F0]",
        className,
      )}
      aria-label="Workspace tabs"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
