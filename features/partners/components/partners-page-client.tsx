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
import { archivePartnerAction } from "@/features/partners/actions/partners.actions";
import { PartnerDialog } from "@/features/partners/components/partner-dialog";
import { PartnerTable } from "@/features/partners/components/partner-table";
import type { Partner, PartnerListFilters } from "@/features/partners/types";

interface PartnersPageClientProps {
  initialPartners: Partner[];
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

function applyFilters(
  partners: Partner[],
  filters: PartnerListFilters,
): Partner[] {
  return partners.filter((partner) => {
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matches =
        partner.companyName.toLowerCase().includes(q) ||
        (partner.partnerCode?.toLowerCase().includes(q) ?? false) ||
        (partner.contactName?.toLowerCase().includes(q) ?? false) ||
        (partner.specialization?.toLowerCase().includes(q) ?? false);
      if (!matches) {
        return false;
      }
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      partner.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.verificationStatus &&
      filters.verificationStatus !== "all" &&
      partner.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }

    if (!filters.includeArchived && filters.status !== "archived") {
      if (partner.status === "archived") {
        return false;
      }
    }

    return true;
  });
}

export function PartnersPageClient({
  initialPartners,
  canCreate,
  canUpdate,
  canArchive,
  breadcrumbs,
}: PartnersPageClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<PartnerListFilters>({
    status: "all",
    verificationStatus: "all",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Partner | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => applyFilters(initialPartners, filters),
    [initialPartners, filters],
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
      const result = await archivePartnerAction(archiveTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Partner archived");
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
        title="Talent Partners"
        description="Manage external talent partners, verification, and workspaces."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Talent Partner
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-4">
        <Input
          value={filters.search ?? ""}
          placeholder="Search partners"
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
              status: e.target.value as PartnerListFilters["status"],
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
        <Select
          value={filters.verificationStatus ?? "all"}
          onChange={(e) =>
            setFilters({
              ...filters,
              verificationStatus: e.target
                .value as PartnerListFilters["verificationStatus"],
            })
          }
        >
          <option value="all">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      <PartnerTable
        partners={filtered}
        loading={pending}
        canUpdate={canUpdate}
        canArchive={canArchive}
        onOpenWorkspace={(partner) =>
          router.push(`/admin/partners/${partner.id}`)
        }
        onEdit={setEditPartner}
        onArchive={setArchiveTarget}
      />

      <PartnerDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onCompleted={refresh}
      />

      <PartnerDialog
        open={Boolean(editPartner)}
        mode="edit"
        partner={editPartner}
        onOpenChange={(open) => {
          if (!open) {
            setEditPartner(null);
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
        entityName={archiveTarget?.companyName ?? "this partner"}
        entityLabel="partner"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </ContentContainer>
  );
}
