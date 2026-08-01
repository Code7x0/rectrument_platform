"use client";

import { Building2, ExternalLink, FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import type { PartnerClientView } from "@/features/shared/entities";
import { CLIENT_STATUS_LABELS } from "@/features/shared/entities";

interface PartnerClientsPageClientProps {
  clients: PartnerClientView[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PartnerClientsPageClient({
  clients,
  breadcrumbs,
}: PartnerClientsPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Clients"
        description="Companies you are recruiting for based on your assigned jobs."
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="When jobs are assigned to you, related clients appear here."
          icon={<Building2 className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <article
              key={client.id}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">
                    {client.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {[client.clientCode, client.industry]
                      .filter(Boolean)
                      .join(" · ") || "Client"}
                  </p>
                </div>
                <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-medium text-[#475569]">
                  {CLIENT_STATUS_LABELS[client.status]}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#94A3B8]">
                    Website
                  </dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {client.website ? (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline"
                      >
                        {client.website}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#94A3B8]">
                    Office / Address
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[#0F172A]">
                    {client.primaryAddress || client.addresses || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#94A3B8]">
                    Employee Size
                  </dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {client.employeeSize || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#94A3B8]">
                    Mode of Work
                  </dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {[
                      client.modeOfWork,
                      client.workDaysInWeek != null
                        ? `${client.workDaysInWeek} days/week`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
              </dl>

              {client.assignedJobTitles.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                    Your assigned roles
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {client.assignedJobTitles.map((title) => (
                      <li
                        key={title}
                        className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-xs text-[#334155]"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {client.briefDeck.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {client.briefDeck.map((file) => (
                    <Button key={file.url} asChild size="sm" variant="outline">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <FileText className="h-3.5 w-3.5" />
                        {file.filename}
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </ContentContainer>
  );
}
