"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import { WorkspaceSection } from "@/features/shared/workspace";
import {
  uploadPartnerDocumentAction,
  uploadPartnerDocumentAsAdminAction,
} from "@/features/partner-documents/actions/documents.actions";
import { DocumentVerificationBadge } from "@/features/partner-documents/components/document-verification-badge";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_BYTES,
  validateDocumentFileMeta,
} from "@/features/partner-documents/schemas/document.schema";
import type {
  PartnerDocumentSlot,
  PartnerDocumentType,
} from "@/features/partner-documents/types";
import { formatDateTime } from "@/lib/utils";

interface PartnerDocumentCardsProps {
  slots: PartnerDocumentSlot[];
  canUpload: boolean;
  /** When set, admin uploads on behalf of this partner. */
  partnerIdForAdmin?: string;
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

export function PartnerDocumentCards({
  slots,
  canUpload,
  partnerIdForAdmin,
}: PartnerDocumentCardsProps) {
  const router = useRouter();
  const inputRefs = useRef<
    Partial<Record<PartnerDocumentType, HTMLInputElement | null>>
  >({});
  const [pendingType, setPendingType] = useState<PartnerDocumentType | null>(
    null,
  );
  const [selected, setSelected] = useState<PartnerDocumentSlot | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPicker(documentType: PartnerDocumentType) {
    inputRefs.current[documentType]?.click();
  }

  async function onFileSelected(
    documentType: PartnerDocumentType,
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    const metaError = validateDocumentFileMeta({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    });
    if (metaError) {
      toast.error(metaError);
      return;
    }

    const formData = new FormData();
    formData.set("documentType", documentType);
    formData.set("file", file);
    if (partnerIdForAdmin) {
      formData.set("partnerId", partnerIdForAdmin);
    }

    setPendingType(documentType);
    startTransition(async () => {
      const result = partnerIdForAdmin
        ? await uploadPartnerDocumentAsAdminAction(formData)
        : await uploadPartnerDocumentAction(formData);

      setPendingType(null);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        slots.find((s) => s.documentType === documentType)?.document
          ? "Document replaced"
          : "Document uploaded",
      );
      router.refresh();
    });
  }

  return (
    <>
      <WorkspaceSection title="Required documents">
        <p className="mb-4 text-sm text-[#64748B]">
          PAN, Aadhaar, and Agreement. PDF, PNG, JPEG, DOC, or DOCX up to 10 MB.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {slots.map((slot) => {
            const uploaded = Boolean(slot.document?.fileUrl);
            const busy = isPending && pendingType === slot.documentType;

            return (
              <div
                key={slot.documentType}
                className="rounded-lg border border-[#E2E8F0] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {slot.label}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {uploaded ? "Uploaded" : "Not uploaded"}
                    </p>
                  </div>
                  {slot.document ? (
                    <DocumentVerificationBadge
                      status={slot.document.verificationStatus}
                    />
                  ) : (
                    <DocumentVerificationBadge status="pending" />
                  )}
                </div>

                <p className="mt-3 text-xs text-[#64748B]">
                  Last updated:{" "}
                  {slot.document?.uploadedAt
                    ? formatDateTime(slot.document.uploadedAt)
                    : "—"}
                </p>

                {slot.document?.rejectionReason ? (
                  <p className="mt-2 text-xs text-[#B91C1C]">
                    {slot.document.rejectionReason}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {slot.document?.fileUrl ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(slot)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a
                          href={slot.document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={slot.document.fileName ?? undefined}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    </>
                  ) : null}

                  {canUpload ? (
                    <>
                      <input
                        ref={(el) => {
                          inputRefs.current[slot.documentType] = el;
                        }}
                        type="file"
                        className="hidden"
                        accept={ALLOWED_DOCUMENT_EXTENSIONS.join(",")}
                        onChange={(e) => {
                          void onFileSelected(
                            slot.documentType,
                            e.target.files?.[0],
                          );
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => openPicker(slot.documentType)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {busy
                          ? "Uploading…"
                          : uploaded
                            ? "Replace"
                            : "Upload"}
                      </Button>
                    </>
                  ) : null}
                </div>

                <p className="mt-2 text-[11px] text-[#94A3B8]">
                  Max {Math.round(MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024))} MB
                </p>
              </div>
            );
          })}
        </div>
      </WorkspaceSection>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.label ?? "Document"}
      >
        {selected?.document ? (
          <div className="space-y-4 pt-2">
            <Detail
              label="File"
              value={selected.document.fileName ?? "Attachment"}
            />
            <Detail
              label="Verification"
              value={selected.document.verificationStatus}
            />
            <Detail
              label="Uploaded"
              value={
                selected.document.uploadedAt
                  ? formatDateTime(selected.document.uploadedAt)
                  : null
              }
            />
            <Detail
              label="Rejection reason"
              value={selected.document.rejectionReason}
            />
            {selected.document.fileUrl ? (
              <Button type="button" asChild>
                <a
                  href={selected.document.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              </Button>
            ) : null}
            <div className="border-t border-[#E2E8F0] pt-4">
              <EntityActivityInline
                entityRef={{
                  kind: "document",
                  id: selected.document.id,
                }}
                title="Document activity"
              />
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  );
}
