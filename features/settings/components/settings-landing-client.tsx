"use client";

import Link from "next/link";
import {
  Bell,
  Briefcase,
  Building2,
  Cable,
  Lock,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  DashboardCard,
  DashboardGrid,
} from "@/features/dashboard/components/dashboard-card";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { SettingsSectionId } from "@/features/settings/types";
import { SETTINGS_SECTION_META } from "@/features/settings/types";

const ICONS = {
  company: Building2,
  users: Users,
  recruitment: Briefcase,
  payouts: Wallet,
  notifications: Bell,
  security: Lock,
  integrations: Cable,
  system: Settings2,
} as const;

const ORDER: SettingsSectionId[] = [
  "company",
  "users",
  "recruitment",
  "payouts",
  "notifications",
  "security",
  "integrations",
  "system",
];

interface SettingsLandingClientProps {
  companyName: string;
  persistenceLabel: string;
}

export function SettingsLandingClient({
  companyName,
  persistenceLabel,
}: SettingsLandingClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={[{ label: "Settings" }]} />
      <PageHeader
        title="Settings"
        description={`Configure ${companyName}. Platform defaults live here — role management stays under Users.`}
      />

      <DashboardSection
        title="Platform configuration"
        description={`Persistence: ${persistenceLabel}`}
      >
        <DashboardGrid columns={4}>
          {ORDER.map((id) => {
            const meta = SETTINGS_SECTION_META[id];
            const Icon = ICONS[id];
            return (
              <Link key={id} href={meta.href} className="block">
                <DashboardCard className="h-full transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#0F172A]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0F172A]">
                        {meta.title}
                      </span>
                      <span className="mt-1 block text-xs text-[#64748B]">
                        {meta.description}
                      </span>
                    </span>
                  </div>
                </DashboardCard>
              </Link>
            );
          })}
        </DashboardGrid>
      </DashboardSection>
    </ContentContainer>
  );
}
