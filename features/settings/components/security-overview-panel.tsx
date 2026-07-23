"use client";

import { Badge } from "@/components/ui/badge";
import type { SecurityOverview } from "@/features/settings/types";

interface SecurityOverviewPanelProps {
  overview: SecurityOverview;
}

export function SecurityOverviewPanel({ overview }: SecurityOverviewPanelProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#64748B]">
        Read-only security overview. Authentication is not configurable here.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#64748B]">
            Session configuration
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">{overview.sessionProvider}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#64748B]">
            Password policy
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">{overview.passwordPolicy}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#64748B]">
            Audit log status
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">{overview.auditLogStatus}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#64748B]">
            Activity retention
          </dt>
          <dd className="mt-1 text-sm text-[#0F172A]">
            {overview.activityRetention}
          </dd>
        </div>
      </dl>
      <ul className="space-y-2">
        {overview.notes.map((note) => (
          <li key={note} className="flex items-start gap-2 text-sm text-[#475569]">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              Note
            </Badge>
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
