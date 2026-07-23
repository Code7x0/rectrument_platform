"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  Briefcase,
  Building2,
  Cable,
  Lock,
  Settings2,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import type { SettingsSectionId } from "@/features/settings/types";
import { SETTINGS_SECTION_META } from "@/features/settings/types";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<
  SettingsSectionId,
  React.ComponentType<{ className?: string }>
> = {
  company: Building2,
  users: Users,
  recruitment: Briefcase,
  payouts: Wallet,
  notifications: Bell,
  security: Lock,
  integrations: Cable,
  system: Settings2,
};

const NAV_ORDER: SettingsSectionId[] = [
  "company",
  "users",
  "recruitment",
  "payouts",
  "notifications",
  "security",
  "integrations",
  "system",
];

interface SettingsShellProps {
  title: string;
  description: string;
  children: ReactNode;
  canManageCompany: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  badge?: string;
}

export function SettingsShell({
  title,
  description,
  children,
  canManageCompany,
  breadcrumbs = [{ label: "Settings", href: "/settings" }, { label: title }],
  badge,
}: SettingsShellProps) {
  const pathname = usePathname();

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title={title}
        description={description}
        actions={
          badge ? (
            <Badge variant="outline">{badge}</Badge>
          ) : canManageCompany ? (
            <Badge variant="secondary">
              <Shield className="mr-1 h-3 w-3" />
              Super Admin
            </Badge>
          ) : (
            <Badge variant="outline">Admin</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          <Link
            href="/settings"
            className={cn(
              "rounded-xl px-3 py-2 text-sm transition",
              pathname === "/settings"
                ? "bg-[#0F172A] text-white"
                : "text-[#475569] hover:bg-[#F1F5F9]",
            )}
          >
            Overview
          </Link>
          {NAV_ORDER.map((id) => {
            const meta = SETTINGS_SECTION_META[id];
            const Icon = SECTION_ICONS[id];
            const active = pathname === meta.href;
            return (
              <Link
                key={id}
                href={meta.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-[#0F172A] text-white"
                    : "text-[#475569] hover:bg-[#F1F5F9]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{meta.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6">
          {children}
        </div>
      </div>
    </ContentContainer>
  );
}
