"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  assignAccountManagerToClientAction,
  setAccountManagerStatusAction,
} from "@/features/account-managers/actions/account-managers.actions";
import type {
  AccountManagerDirectoryRow,
  AccountManagerDirectorySummary,
} from "@/features/account-managers/services/account-managers.service";
import type { LookupOption } from "@/services/lookups";

interface AccountManagersPageClientProps {
  rows: AccountManagerDirectoryRow[];
  summary: AccountManagerDirectorySummary;
  clients: LookupOption[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function AccountManagersPageClient({
  rows,
  summary,
  clients,
  breadcrumbs,
}: AccountManagersPageClientProps) {
  const [assignTarget, setAssignTarget] =
    useState<AccountManagerDirectoryRow | null>(null);
  const [clientId, setClientId] = useState("");
  const [pending, startTransition] = useTransition();

  const columns = useMemo<DataTableColumn<AccountManagerDirectoryRow>[]>(
    () => [
      {
        id: "amCode",
        header: "AM ID",
        cell: (row) => (
          <span className="font-mono font-medium text-[#0F172A]">
            {row.amCode}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        className: "text-[#64748B]",
        cell: (row) => row.email,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={
              row.status === "active"
                ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            }
          >
            {row.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        id: "clients",
        header: "Clients",
        cell: (row) => (
          <div>
            <p className="font-medium text-[#0F172A]">{row.clientCount}</p>
            {row.clientNames.length > 0 ? (
              <p className="text-xs text-[#94A3B8] line-clamp-1">
                {row.clientNames.slice(0, 3).join(", ")}
                {row.clientNames.length > 3 ? "…" : ""}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAssignTarget(row);
                setClientId("");
              }}
            >
              Assign client
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const next =
                  row.status === "active" ? "inactive" : "active";
                startTransition(async () => {
                  const result = await setAccountManagerStatusAction({
                    accountManagerId: row.id,
                    status: next,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(
                    next === "active"
                      ? "Account Manager activated"
                      : "Account Manager deactivated",
                  );
                });
              }}
            >
              {row.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ),
      },
    ],
    [pending],
  );

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Account Managers"
        description="See who is active, who is inactive, and which clients they own. Assigning an AM to a client covers that client's jobs."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total" value={summary.total} />
        <MetricCard label="Active" value={summary.active} tone="positive" />
        <MetricCard label="Inactive" value={summary.inactive} tone="muted" />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        emptyTitle="No Account Managers"
        emptyDescription="Invite an Account Manager from Role Management, or add a row in Airtable Account Managers."
      />

      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Account Manager to client</DialogTitle>
            <DialogDescription>
              Sets Clients.Account Owner for {assignTarget?.amCode}. All jobs
              under that client become visible to this AM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="assign-client">Client</Label>
            <Select
              id="assign-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAssignTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!clientId || !assignTarget || pending}
              onClick={() => {
                if (!assignTarget || !clientId) {
                  return;
                }
                startTransition(async () => {
                  const result = await assignAccountManagerToClientAction({
                    clientId,
                    accountManagerId: assignTarget.id,
                    merge: true,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Account Manager assigned to client");
                  setAssignTarget(null);
                });
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentContainer>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "positive" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === "positive"
            ? "text-emerald-700"
            : tone === "muted"
              ? "text-slate-500"
              : "text-[#0F172A]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
