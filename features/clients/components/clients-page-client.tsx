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
import { archiveClientAction } from "@/features/clients/actions/clients.actions";
import { ClientDialog } from "@/features/clients/components/client-dialog";
import { ClientTable } from "@/features/clients/components/client-table";
import type { Client, ClientListFilters } from "@/features/clients/types";
import type { LookupOption } from "@/services/lookups";

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

function applyFilters(clients: Client[], filters: ClientListFilters): Client[] {
  return clients.filter((client) => {
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matches =
        client.name.toLowerCase().includes(q) ||
        (client.clientCode?.toLowerCase().includes(q) ?? false) ||
        (client.industry?.toLowerCase().includes(q) ?? false) ||
        (client.primaryContact?.toLowerCase().includes(q) ?? false);
      if (!matches) {
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
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => applyFilters(initialClients, filters),
    [initialClients, filters],
  );

  function refresh() {
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
        description="Hiring companies and their workspaces."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Client
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
        <Input
          value={filters.search ?? ""}
          placeholder="Search clients"
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
        loading={pending}
        canUpdate={canUpdate}
        canArchive={canArchive}
        onOpenWorkspace={(client) =>
          router.push(`${basePath}/${client.id}`)
        }
        onEdit={setEditClient}
        onArchive={setArchiveTarget}
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
        onOpenChange={(open) => {
          if (!open) {
            setEditClient(null);
          }
        }}
        onCompleted={refresh}
      />

      <ArchiveDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        entityName={archiveTarget?.name ?? "this client"}
        entityLabel="client"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </ContentContainer>
  );
}
