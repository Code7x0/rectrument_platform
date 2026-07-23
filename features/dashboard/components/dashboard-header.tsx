import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title={title} description={description} actions={actions} />
    </div>
  );
}
