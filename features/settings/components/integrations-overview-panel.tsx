"use client";

import { Badge } from "@/components/ui/badge";
import type { IntegrationStatusItem } from "@/features/settings/types";

const STATUS_LABEL: Record<IntegrationStatusItem["status"], string> = {
  connected: "Connected",
  configured: "Configured",
  not_configured: "Not configured",
  future: "Future",
};

interface IntegrationsOverviewPanelProps {
  items: IntegrationStatusItem[];
}

export function IntegrationsOverviewPanel({
  items,
}: IntegrationsOverviewPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748B]">
        Read-only integration status. Credentials are not managed in this app.
      </p>
      <ul className="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{item.name}</p>
              <p className="mt-0.5 text-xs text-[#64748B]">{item.description}</p>
            </div>
            <Badge
              variant={
                item.status === "connected"
                  ? "success"
                  : item.status === "future"
                    ? "outline"
                    : "secondary"
              }
            >
              {STATUS_LABEL[item.status]}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
