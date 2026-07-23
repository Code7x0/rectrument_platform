"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  Activity,
  Bell,
  Briefcase,
  Building2,
  FileText,
  FolderKanban,
  Settings2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { highlightMatch } from "@/features/search/services/ranking";
import type { SearchEntityType, SearchResult } from "@/features/search/types";
import { cn } from "@/lib/utils";

const ICONS: Record<SearchEntityType, ComponentType<{ className?: string }>> = {
  client: Building2,
  job: Briefcase,
  partner: Users,
  account_manager: UserRound,
  user: UserRound,
  allocation: FolderKanban,
  candidate: UserRound,
  submission: UserRound,
  document: FileText,
  payout: Wallet,
  notification: Bell,
  activity: Activity,
  settings: Settings2,
};

interface SearchResultItemProps {
  item: SearchResult;
  query: string;
  active?: boolean;
  onSelect?: () => void;
  id?: string;
}

export function SearchResultItem({
  item,
  query,
  active = false,
  onSelect,
  id,
}: SearchResultItemProps) {
  const Icon = ICONS[item.icon] ?? Briefcase;
  const titleHtml = highlightMatch(item.title, query);

  return (
    <Link
      id={id}
      href={item.url}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
        active ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]",
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className="text-sm font-medium text-[#0F172A]"
            dangerouslySetInnerHTML={{ __html: titleHtml }}
          />
          {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
        </span>
        {item.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-[#64748B]">
            {item.subtitle}
          </span>
        ) : null}
        {item.matchedField ? (
          <span className="mt-1 block text-[11px] text-[#94A3B8]">
            Matched {item.matchedField}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
