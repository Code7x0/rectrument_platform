"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AssignAccountManagerDialog, type AssignAmTarget } from "@/features/account-managers/components/assign-account-manager-dialog";
import { archiveClientAction } from "@/features/clients/actions/clients.actions";
import { ClientDialog } from "@/features/clients/components/client-dialog";
import { ClientTable } from "@/features/clients/components/client-table";
import type { Client, ClientListFilters } from "@/features/clients/types";
import type { LookupOption } from "@/services/lookups";
import { signalLiveDataChange } from "@/lib/live-sync";

interface ClientsPageClientProps {
  initialClients: Client[];
  accountManagers: LookupOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  canDelete?: boolean;
  basePath: "/admin/clients" | "/account-manager/clients";
  breadcrumbs: Array<{ label: string; href?: string }>;
}

function applyFilters(
  clients: Client[],
  filters: ClientListFilters,
  options?: { hideClientName?: boolean },
): Client[] {
  return clients.filter((client) => {
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchesCode =
        client.clientCode?.toLowerCase().includes(q) ?? false;
      const matchesIndustry =
        client.industry?.toLowerCase().includes(q) ?? false;
      const matchesContact =
        client.primaryContact?.toLowerCase().includes(q) ?? false;
      const matchesName = options?.hideClientName
        ? false
        : client.name.toLowerCase().includes(q);
      if (!(matchesCode || matchesIndustry || matchesContact || matchesName)) {
        return false;
      }
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      client.status !== filters.status
    ) {
      return false;
    }

    if (!filters.includeArchived && filters.status !== "archived") {
      if (client.status === "archived") {
        return false;
      }
    }

    return true;
  });
}

export function ClientsPageClient({
  initialClients,
  accountManagers,
  canCreate,
  canUpdate,
  canArchive,
  canDelete = false,
  basePath,
  breadcrumbs,
}: ClientsPageClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ClientListFilters>({
    status: "all",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);
  const [assignAmOpen, setAssignAmOpen] = useState(false);
  const [assignAmTarget, setAssignAmTarget] = useState<AssignAmTarget>(null);
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const isAmPath = basePath === "/account-manager/clients";

  const clientOptions = useMemo<LookupOption[]>(
    () =>
      initialClients
        .filter((c) => c.status !== "archived")
        .map((c) => ({
          id: c.id,
          label: c.clientCode
            ? isAmPath
              ? c.clientCode
              : `${c.clientCode} — ${c.name}`
            : isAmPath
              ? c.id
              : c.name,
        })),
    [initialClients, isAmPath],
  );

  const filtered = useMemo(
    () =>
      applyFilters(initialClients, filters, { hideClientName: isAmPath }),
    [initialClients, filters, isAmPath],
  );

  function refresh() {
    signalLiveDataChange();
    startTransition(() => router.refresh());
  }

  async function confirmArchive() {
    if (!archiveTarget) {
      return;
    }
    setArchiving(true);
    try {
      const result = await archiveClientAction(archiveTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Client archived");
      setArchiveTarget(null);
      refresh();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Clients"
        description={
          isAmPath
            ? "Your assigned clients by Client ID. Open a workspace to manage jobs and talent partners."
            : "Hiring companies and their workspaces. Assign an Account Manager to own each client."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate &&
            basePath === "/admin/clients" &&
            accountManagers.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignAmTarget(null);
                  setAssignAmOpen(true);
                }}
              >
                Assign Account Manager
              </Button>
            ) : null}
            {canCreate ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Client
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
        <Input
          value={filters.search ?? ""}
          placeholder={isAmPath ? "Search Client ID, industry…" : "Search clients"}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value })
          }
          className="md:col-span-2"
        />
        <Select
          value={filters.status ?? "all"}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: e.target.value as ClientListFilters["status"],
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <ClientTable
        clients={filtered}
        loading={false}
        canUpdate={canUpdate}
        canArchive={canArchive}
        hideClientName={isAmPath}
        onOpenWorkspace={(client) =>
          router.push(`${basePath}/${client.id}`)
        }
        onEdit={setEditClient}
        onArchive={setArchiveTarget}
        onAssignAm={
          canUpdate && basePath === "/admin/clients"
            ? (client) => {
                setAssignAmTarget({
                  kind: "client",
                  clientId: client.id,
                  clientLabel: client.clientCode
                    ? `${client.clientCode} — ${client.name}`
                    : client.name,
                });
                setAssignAmOpen(true);
              }
            : undefined
        }
      />

      <ClientDialog
        open={createOpen}
        mode="create"
        accountManagers={accountManagers}
        onOpenChange={setCreateOpen}
        onCompleted={refresh}
      />

      <ClientDialog
        open={Boolean(editClient)}
        mode="edit"
        client={editClient}
        accountManagers={accountManagers}
        canDelete={canDelete}
        lockAccountManager={isAmPath}
        hideClientName={isAmPath}
        onOpenChange={(open) => {
          if (!open) {
            setEditClient(null);
          }
        }}
        onCompleted={refresh}
      />

      {basePath === "/admin/clients" ? (
        <AssignAccountManagerDialog
          open={assignAmOpen}
          onOpenChange={(open) => {
            setAssignAmOpen(open);
            if (!open) {
              setAssignAmTarget(null);
            }
          }}
          clients={clientOptions}
          accountManagers={accountManagers}
          target={assignAmTarget}
          initialAccountManagerId={
            assignAmTarget?.kind === "client"
              ? (initialClients.find((c) => c.id === assignAmTarget.clientId)
                  ?.accountManagerId ?? "")
              : ""
          }
          onCompleted={refresh}
        />
      ) : null}

      <ArchiveDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        entityName={
          isAmPath
            ? (archiveTarget?.clientCode ?? "this client")
            : (archiveTarget?.name ?? "this client")
        }
        entityLabel="client"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </ContentContainer>
  );
}
