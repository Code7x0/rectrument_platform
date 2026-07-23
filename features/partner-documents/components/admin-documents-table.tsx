"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Download, Eye, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import {
  archivePartnerDocumentAction,
  rejectPartnerDocumentAction,
  verifyPartnerDocumentAction,
} from "@/features/partner-documents/actions/documents.actions";
import { DocumentVerificationBadge } from "@/features/partner-documents/components/document-verification-badge";
import {
  DOCUMENT_TYPE_LABELS,
  type PartnerDocument,
} from "@/features/partner-documents/types";
import { formatDate } from "@/lib/utils";

interface AdminDocumentsTableProps {
  documents: PartnerDocument[];
  canVerify: boolean;
  canArchive: boolean;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A]">{value || "—"}</p>
    </div>
  );
}

export function AdminDocumentsTable({
  documents,
  canVerify,
  canArchive,
}: AdminDocumentsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PartnerDocument | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PartnerDocument | null>(
    null,
  );
  const [approveTarget, setApproveTarget] = useState<PartnerDocument | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] = useState<PartnerDocument | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const columns = useMemo<DataTableColumn<PartnerDocument>[]>(
    () => [
      {
        id: "partner",
        header: "Talent Partner",
        cell: (row) => row.partnerName ?? "—",
      },
      {
        id: "type",
        header: "Document Type",
        cell: (row) => DOCUMENT_TYPE_LABELS[row.documentType],
      },
      {
        id: "uploaded",
        header: "Uploaded Date",
        cell: (row) =>
          row.uploadedAt ? formatDate(row.uploadedAt) : "—",
      },
      {
        id: "status",
        header: "Verification Status",
        cell: (row) => (
          <DocumentVerificationBadge status={row.verificationStatus} />
        ),
      },
      {
        id: "verifiedBy",
        header: "Verified By",
        cell: (row) => row.verifiedByName ?? "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(row)}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            {row.fileUrl ? (
              <Button type="button" size="sm" variant="ghost" asChild>
                <a
                  href={row.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={row.fileName ?? undefined}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
            ) : null}
            {canVerify && row.verificationStatus !== "verified" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setApproveTarget(row)}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
            ) : null}
            {canVerify && row.verificationStatus !== "rejected" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectionReason("");
                  setRejectTarget(row);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            ) : null}
            {canArchive && row.status === "active" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setArchiveTarget(row)}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canArchive, canVerify],
  );

  function runAction(
    action: () => Promise<{ success: boolean; message?: string }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message ?? "Action failed");
        return;
      }
      toast.success(successMessage);
      setApproveTarget(null);
      setRejectTarget(null);
      setArchiveTarget(null);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={documents}
        emptyTitle="No documents yet"
        emptyDescription="Partner uploads will appear here for review."
        getRowId={(row) => row.id}
      />

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={
          selected
            ? DOCUMENT_TYPE_LABELS[selected.documentType]
            : "Document"
        }
      >
        {selected ? (
          <div className="space-y-4 pt-2">
            <Detail label="Partner" value={selected.partnerName} />
            <Detail label="File" value={selected.fileName} />
            <Detail
              label="Uploaded"
              value={
                selected.uploadedAt ? formatDate(selected.uploadedAt) : null
              }
            />
            <Detail
              label="Verification"
              value={selected.verificationStatus}
            />
            <Detail label="Verified by" value={selected.verifiedByName} />
            <Detail label="Rejection reason" value={selected.rejectionReason} />
            {selected.fileUrl ? (
              <Button type="button" asChild>
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              </Button>
            ) : null}
            <div className="border-t border-[#E2E8F0] pt-4">
              <EntityActivityInline
                entityRef={{ kind: "document", id: selected.id }}
                title="Document activity"
              />
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
          }
        }}
        title="Approve document?"
        description="Mark this document as verified. The partner will see the updated status."
        confirmLabel="Approve"
        loading={isPending}
        onConfirm={() => {
          if (!approveTarget) {
            return;
          }
          runAction(
            () => verifyPartnerDocumentAction(approveTarget.id),
            "Document verified",
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
        title="Reject document?"
        description={
          <div className="space-y-3">
            <p>Provide a short reason. The partner can replace the file.</p>
            <div className="space-y-1.5 text-left">
              <Label htmlFor="rejectionReason">Rejection reason</Label>
              <Input
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Image is unclear"
              />
            </div>
          </div>
        }
        confirmLabel="Reject"
        variant="destructive"
        loading={isPending}
        onConfirm={() => {
          if (!rejectTarget) {
            return;
          }
          if (rejectionReason.trim().length < 3) {
            toast.error("Provide a short rejection reason");
            return;
          }
          runAction(
            () =>
              rejectPartnerDocumentAction(
                rejectTarget.id,
                rejectionReason.trim(),
              ),
            "Document rejected",
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        title="Archive document?"
        description="Archived documents leave the active review queue. Soft archive only."
        confirmLabel="Archive"
        variant="destructive"
        loading={isPending}
        onConfirm={() => {
          if (!archiveTarget) {
            return;
          }
          runAction(
            () => archivePartnerDocumentAction(archiveTarget.id),
            "Document archived",
          );
        }}
      />
    </>
  );
}
