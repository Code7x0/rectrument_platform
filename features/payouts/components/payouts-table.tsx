"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  FileText,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import {
  markPayoutCompletedAction,
  markPayoutPaidAction,
  updatePayoutNotesAction,
  updatePayoutStatusAction,
} from "@/features/payouts/actions/payouts.actions";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import {
  getAllowedPayoutTransitions,
  requiresAmount,
} from "@/features/payouts/schemas/payout.schema";
import {
  PAYOUT_STATUS_LABELS,
  type Payout,
  type PayoutStatus,
} from "@/features/payouts/types";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { LookupOption } from "@/services/lookups";

interface PayoutsTableProps {
  payouts: Payout[];
  partners: LookupOption[];
  accountManagers: LookupOption[];
  canManage: boolean;
  canMarkPaid: boolean;
  role: "admin" | "account_manager";
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
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

export function PayoutsTable({
  payouts,
  partners,
  accountManagers,
  canManage,
  canMarkPaid,
  role,
}: PayoutsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [amFilter, setAmFilter] = useState("all");
  const [selected, setSelected] = useState<Payout | null>(null);
  const [statusTarget, setStatusTarget] = useState<Payout | null>(null);
  const [nextStatus, setNextStatus] = useState<PayoutStatus | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paidTarget, setPaidTarget] = useState<Payout | null>(null);
  const [completedTarget, setCompletedTarget] = useState<Payout | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return payouts.filter((row) => {
      if (statusFilter !== "all" && row.payoutStatus !== statusFilter) {
        return false;
      }
      if (partnerFilter !== "all" && row.partnerId !== partnerFilter) {
        return false;
      }
      if (amFilter !== "all" && row.accountManagerId !== amFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          (row.partnerCode?.toLowerCase().includes(q) ?? false) ||
          (row.partnerName?.toLowerCase().includes(q) ?? false) ||
          (row.candidateName?.toLowerCase().includes(q) ?? false) ||
          (row.jobTitle?.toLowerCase().includes(q) ?? false);
        if (!matches) {
          return false;
        }
      }
      return true;
    });
  }, [payouts, statusFilter, partnerFilter, amFilter, search]);

  const columns = useMemo<DataTableColumn<Payout>[]>(
    () => [
      {
        id: "partner",
        header: "Talent Partner",
        cell: (row) => (
          <span className="font-medium text-[#0F172A]">
            {row.partnerName ?? row.partnerCode ?? "—"}
          </span>
        ),
      },
      {
        id: "candidate",
        header: "Candidate",
        cell: (row) => row.candidateName ?? "—",
      },
      {
        id: "job",
        header: "Job",
        cell: (row) => row.jobTitle ?? "—",
      },
      {
        id: "amount",
        header: "Amount",
        cell: (row) =>
          row.amount != null && row.amount > 0
            ? formatCurrency(row.amount, row.currency)
            : "—",
      },
      {
        id: "recruitment",
        header: "Recruitment",
        cell: (row) =>
          row.recruitmentStatus ? (
            <SubmissionStatusBadge status={row.recruitmentStatus} />
          ) : (
            "—"
          ),
      },
      {
        id: "payoutStatus",
        header: "Payout Status",
        cell: (row) => <PayoutStatusBadge status={row.payoutStatus} />,
      },
      {
        id: "eligibleDate",
        header: "Eligible",
        className: "text-[#64748B]",
        cell: (row) =>
          row.eligibleDate ? formatDate(row.eligibleDate) : "—",
      },
      {
        id: "paidDate",
        header: "Paid",
        className: "text-[#64748B]",
        cell: (row) => (row.paidDate ? formatDate(row.paidDate) : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (row) => (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                  setSelected(row);
                  setNotes(row.notes ?? "");
                }}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusTarget(row);
                  setNextStatus(null);
                  setAmount(row.amount != null ? String(row.amount) : "");
                  setNotes(row.notes ?? "");
                }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                Update
              </Button>
            ) : null}
            {canMarkPaid && row.payoutStatus === "processing" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPaidTarget(row)}
              >
                <Wallet className="h-3.5 w-3.5" />
                Mark Paid
              </Button>
            ) : null}
            {canMarkPaid && row.payoutStatus === "paid" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setCompletedTarget(row)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, canMarkPaid],
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function submitStatusUpdate() {
    if (!statusTarget || !nextStatus) {
      return;
    }

    const parsedAmount = amount.trim() ? Number(amount) : undefined;
    if (requiresAmount(nextStatus) && (!parsedAmount || parsedAmount <= 0)) {
      toast.error("Enter a valid amount for this status");
      return;
    }

    const result = await updatePayoutStatusAction(
      statusTarget.id,
      nextStatus,
      {
        amount: parsedAmount,
        notes: notes.trim() || undefined,
      },
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success("Payout updated");
    setStatusTarget(null);
    refresh();
  }

  async function saveNotesOnly() {
    if (!selected) {
      return;
    }
    const result = await updatePayoutNotesAction(selected.id, notes);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Notes saved");
    setSelected(null);
    refresh();
  }

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-5">
        <Input
          value={search}
          placeholder="Search partner, candidate, job…"
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2"
        />
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PayoutStatus | "all")
          }
        >
          <option value="all">All payout statuses</option>
          {(Object.keys(PAYOUT_STATUS_LABELS) as PayoutStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </Select>
        <Select
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
        >
          <option value="all">All talent partners</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.label}
            </option>
          ))}
        </Select>
        <Select value={amFilter} onChange={(e) => setAmFilter(e.target.value)}>
          <option value="all">All account managers</option>
          {accountManagers.map((am) => (
            <option key={am.id} value={am.id}>
              {am.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        loading={isPending}
        emptyTitle="No payouts yet"
        emptyDescription="Payouts are created automatically when talent partners submit candidates."
      />

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.candidateName ?? "Payout details"}
      >
        {selected ? (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {selected.recruitmentStatus ? (
                <SubmissionStatusBadge status={selected.recruitmentStatus} />
              ) : null}
              <PayoutStatusBadge status={selected.payoutStatus} />
            </div>
            <Detail
              label="Talent Partner"
              value={selected.partnerName ?? selected.partnerCode}
            />
            <Detail label="Job" value={selected.jobTitle} />
            <Detail
              label="Amount"
              value={
                selected.amount != null && selected.amount > 0
                  ? formatCurrency(selected.amount, selected.currency)
                  : null
              }
            />
            <Detail
              label="Eligible date"
              value={
                selected.eligibleDate ? formatDate(selected.eligibleDate) : null
              }
            />
            <Detail
              label="Paid date"
              value={selected.paidDate ? formatDate(selected.paidDate) : null}
            />
            <Detail
              label="Last updated"
              value={
                selected.lastUpdated
                  ? formatDateTime(selected.lastUpdated)
                  : null
              }
            />
            {canManage ? (
              <div className="space-y-2">
                <Label htmlFor="detailNotes">Notes</Label>
                <Textarea
                  id="detailNotes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Operational notes visible to admins and account managers"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotes(selected.notes ?? "");
                    void saveNotesOnly();
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Save notes
                </Button>
              </div>
            ) : (
              <Detail label="Notes" value={selected.notes} />
            )}

            <div className="border-t border-[#E2E8F0] pt-5">
              <EntityActivityInline
                entityRef={{ kind: "payout", id: selected.id }}
                title="Payout activity"
              />
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
        title="Update payout status"
        description={
          statusTarget ? (
            <div className="space-y-3 text-left">
              <p>
                {statusTarget.candidateName} · {statusTarget.jobTitle}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="nextStatus">New status</Label>
                <Select
                  id="nextStatus"
                  value={nextStatus ?? ""}
                  onChange={(e) =>
                    setNextStatus(e.target.value as PayoutStatus)
                  }
                >
                  <option value="">Select status</option>
                  {getAllowedPayoutTransitions(
                    statusTarget.payoutStatus,
                    role,
                  ).map((status) => (
                    <option key={status} value={status}>
                      {PAYOUT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </div>
              {nextStatus && requiresAmount(nextStatus) ? (
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount ({statusTarget.currency})</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="statusNotes">Notes</Label>
                <Textarea
                  id="statusNotes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          ) : null
        }
        confirmLabel="Update status"
        loading={isPending}
        onConfirm={() => void submitStatusUpdate()}
      />

      <ConfirmDialog
        open={Boolean(paidTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPaidTarget(null);
          }
        }}
        title="Mark payout as paid?"
        description="Confirm payment has been sent to the talent partner."
        confirmLabel="Mark Paid"
        loading={isPending}
        onConfirm={() => {
          if (!paidTarget) {
            return;
          }
          startTransition(async () => {
            const result = await markPayoutPaidAction(paidTarget.id);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Payout marked paid");
            setPaidTarget(null);
            refresh();
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(completedTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletedTarget(null);
          }
        }}
        title="Mark payout completed?"
        description="Close the payout lifecycle after reconciliation."
        confirmLabel="Mark Completed"
        loading={isPending}
        onConfirm={() => {
          if (!completedTarget) {
            return;
          }
          startTransition(async () => {
            const result = await markPayoutCompletedAction(completedTarget.id);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Payout completed");
            setCompletedTarget(null);
            refresh();
          });
        }}
      />
    </>
  );
}
