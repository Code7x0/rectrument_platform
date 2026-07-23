"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PayoutsTable } from "@/features/payouts/components/payouts-table";
import type { Payout } from "@/features/payouts/types";
import type { LookupOption } from "@/services/lookups";

interface PayoutsPageClientProps {
  payouts: Payout[];
  partners: LookupOption[];
  accountManagers: LookupOption[];
  canManage: boolean;
  canMarkPaid: boolean;
  role: "admin" | "account_manager";
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PayoutsPageClient({
  payouts,
  partners,
  accountManagers,
  canManage,
  canMarkPaid,
  role,
  title,
  description,
  breadcrumbs,
}: PayoutsPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title={title} description={description} />
      <PayoutsTable
        payouts={payouts}
        partners={partners}
        accountManagers={accountManagers}
        canManage={canManage}
        canMarkPaid={canMarkPaid}
        role={role}
      />
    </ContentContainer>
  );
}
