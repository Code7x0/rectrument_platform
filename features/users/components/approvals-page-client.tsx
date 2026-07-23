"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ContentContainer } from "@/components/shared/content-container";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  approvePartnerAction,
  rejectPartnerAction,
} from "@/features/users/actions";
import type { PendingPartnerApplication } from "@/features/users/types";
import { IDENTITY_VISIBILITY_LABELS } from "@/features/users/types";
import { DOCUMENT_TYPE_LABELS } from "@/features/partner-documents/types";

interface ApprovalsPageClientProps {
  applications: PendingPartnerApplication[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function ApprovalsPageClient({
  applications,
  breadcrumbs,
}: ApprovalsPageClientProps) {
  const [rows, setRows] = useState(applications);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PendingPartnerApplication | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] =
    useState<PendingPartnerApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return rows;
    }
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const code = row.partner?.partnerCode?.toLowerCase() ?? "";
      return (
        row.user.fullName.toLowerCase().includes(q) ||
        row.user.email.toLowerCase().includes(q) ||
        code.includes(q)
      );
    });
  }, [rows, search]);

  const columns: DataTableColumn<PendingPartnerApplication>[] = [
    {
      id: "partnerId",
      header: "Partner ID",
      cell: (row) => row.partner?.partnerCode ?? "—",
    },
    {
      id: "name",
      header: "Name",
      cell: (row) => row.user.fullName,
    },
    {
      id: "email",
      header: "Email",
      cell: (row) => row.user.email,
    },
    {
      id: "applied",
      header: "Applied Date",
      cell: (row) =>
        row.appliedAt ? new Date(row.appliedAt).toLocaleDateString() : "—",
    },
    {
      id: "docs",
      header: "Documents",
      cell: (row) => `${row.documents.length} uploaded`,
    },
    {
      id: "visibility",
      header: "Identity Visibility",
      cell: (row) =>
        row.user.identityVisibility
          ? IDENTITY_VISIBILITY_LABELS[row.user.identityVisibility]
          : "Private",
    },
    {
      id: "status",
      header: "Status",
      cell: () => <Badge variant="secondary">Pending</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
            View
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await approvePartnerAction(row.user.id);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success("Partner approved — activation email queued");
                setRows((current) =>
                  current.filter((item) => item.user.id !== row.user.id),
                );
                setSelected(null);
              });
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setRejectTarget(row);
              setRejectReason("");
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Pending Talent Partners"
        description="Review registrations, documents, and identity visibility before enabling login."
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search name, email, Partner ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No pending applications"
          description="New Talent Partner registrations will appear here for review."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(row) => row.user.id}
        />
      )}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.user.fullName ?? "Application"}
      >
        {selected ? (
          <div className="mt-4 space-y-4 text-sm text-[#334155]">
            <p className="text-[#64748B]">{selected.user.email}</p>
            <p>
              <span className="font-medium text-[#0F172A]">Partner ID: </span>
              {selected.partner?.partnerCode ?? "—"}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Phone: </span>
              {selected.user.phone ?? "—"}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Location: </span>
              {[selected.user.city, selected.user.state]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Skills: </span>
              {selected.user.skills ?? "—"}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Experience: </span>
              {selected.user.experience ?? "—"}
            </p>
            <div>
              <p className="mb-2 font-medium text-[#0F172A]">Documents</p>
              <ul className="space-y-1">
                {selected.documents.map((doc) => (
                  <li key={doc.id}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType]} —{" "}
                    {doc.verificationStatus}
                    {doc.fileUrl ? (
                      <>
                        {" · "}
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2563EB] underline"
                        >
                          Open
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
        title="Reject application"
        description={
          <div className="space-y-3">
            <p>
              The applicant will remain inactive and receive a rejection email.
            </p>
            <Textarea
              placeholder="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Reject"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!rejectTarget) {
            return;
          }
          if (rejectReason.trim().length < 3) {
            toast.error("Provide a rejection reason");
            return;
          }
          startTransition(async () => {
            const result = await rejectPartnerAction(
              rejectTarget.user.id,
              rejectReason.trim(),
            );
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Application rejected");
            setRows((current) =>
              current.filter((item) => item.user.id !== rejectTarget.user.id),
            );
            setRejectTarget(null);
            setSelected(null);
          });
        }}
      />
    </ContentContainer>
  );
}
