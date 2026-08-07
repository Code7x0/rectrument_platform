"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
  assignAccountManagerToJobAction,
} from "@/features/account-managers/actions/account-managers.actions";
import { signalLiveDataChange } from "@/lib/live-sync";
import type { LookupOption } from "@/services/lookups";

export type AssignAmTarget =
  | { kind: "client"; clientId: string; clientLabel?: string }
  | {
      kind: "job";
      jobId: string;
      jobLabel: string;
      clientId?: string | null;
      clientLabel?: string | null;
      accountManagerId?: string | null;
      accountManagerIds?: string[];
    }
  | null;

interface AssignAccountManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: LookupOption[];
  accountManagers: LookupOption[];
  /** When set, dialog targets this client or job. */
  target?: AssignAmTarget;
  /** Pre-select a client when opened without a row target. */
  initialClientId?: string;
  /** Pre-select a single AM (legacy). */
  initialAccountManagerId?: string;
  /** Pre-select multiple AMs. */
  initialAccountManagerIds?: string[];
  onCompleted?: () => void;
}

function amOptionLabel(am: LookupOption): string {
  return am.code?.trim() || am.id;
}

/**
 * Assign or unassign Account Manager(s) — Admin / Super Admin.
 * Clients and jobs both support multiple AMs.
 */
export function AssignAccountManagerDialog({
  open,
  onOpenChange,
  clients,
  accountManagers,
  target = null,
  initialClientId = "",
  initialAccountManagerId = "",
  initialAccountManagerIds = [],
  onCompleted,
}: AssignAccountManagerDialogProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [accountManagerIds, setAccountManagerIds] = useState<string[]>(
    initialAccountManagerIds,
  );
  const [pending, startTransition] = useTransition();

  const isJob = target?.kind === "job";
  const isClientLocked =
    target?.kind === "client" || (isJob && Boolean(target.clientId));
  const hadAssignment = Boolean(
    (target?.kind === "job" &&
      ((target.accountManagerIds?.length ?? 0) > 0 ||
        target.accountManagerId)) ||
      (target?.kind === "client" &&
        (initialAccountManagerIds.length > 0 || initialAccountManagerId)) ||
      (!target &&
        (initialAccountManagerIds.length > 0 || initialAccountManagerId)),
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (target?.kind === "client") {
      setClientId(target.clientId);
      const ids =
        initialAccountManagerIds.length > 0
          ? initialAccountManagerIds
          : initialAccountManagerId
            ? [initialAccountManagerId]
            : [];
      setAccountManagerIds(ids);
      return;
    }
    if (target?.kind === "job") {
      setClientId(target.clientId ?? "");
      const ids =
        target.accountManagerIds?.length
          ? target.accountManagerIds
          : target.accountManagerId
            ? [target.accountManagerId]
            : initialAccountManagerIds.length > 0
              ? initialAccountManagerIds
              : initialAccountManagerId
                ? [initialAccountManagerId]
                : [];
      setAccountManagerIds(ids);
      return;
    }
    setClientId(initialClientId);
    const ids =
      initialAccountManagerIds.length > 0
        ? initialAccountManagerIds
        : initialAccountManagerId
          ? [initialAccountManagerId]
          : [];
    setAccountManagerIds(ids);
  }, [
    open,
    target,
    initialClientId,
    initialAccountManagerId,
    initialAccountManagerIds,
  ]);

  function resetAndClose() {
    onOpenChange(false);
  }

  function toggleAm(id: string, checked: boolean) {
    setAccountManagerIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((row) => row !== id),
    );
  }

  const isUnassign = accountManagerIds.length === 0;
  const canSubmit = isJob
    ? Boolean(target?.kind === "job") &&
      (accountManagerIds.length > 0 || hadAssignment)
    : Boolean(clientId) && (accountManagerIds.length > 0 || hadAssignment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isJob
              ? "Account Managers for job"
              : "Account Managers for client"}
          </DialogTitle>
          <DialogDescription>
            {isJob
              ? "Tag one or more Account Managers on this job only. Other jobs for the same client are not affected. Clear all to unassign."
              : "Tag one or more Account Managers as Account Owners. Large accounts can have multiple AMs."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isJob && target?.kind === "job" ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                Job
              </p>
              <p className="mt-1 text-sm font-medium text-[#0F172A]">
                {target.jobLabel}
              </p>
              {target.clientLabel ? (
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Client: {target.clientLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="assign-am-client">Client</Label>
              <Select
                id="assign-am-client"
                value={clientId}
                disabled={isClientLocked && target?.kind === "client"}
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
          )}

          <div className="space-y-2">
            <Label>Account Managers</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
              {accountManagers.map((am) => {
                const checked = accountManagerIds.includes(am.id);
                return (
                  <label
                    key={am.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-[#0F172A]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#CBD5E1]"
                      checked={checked}
                      onChange={(event) =>
                        toggleAm(am.id, event.target.checked)
                      }
                    />
                    <span>{amOptionLabel(am)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isUnassign ? "outline" : "default"}
            disabled={!canSubmit || pending}
            onClick={() => {
              startTransition(async () => {
                if (isJob && target?.kind === "job") {
                  const result = await assignAccountManagerToJobAction({
                    jobId: target.jobId,
                    accountManagerIds,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(
                    accountManagerIds.length > 0
                      ? "Account Managers assigned to job"
                      : "Account Managers unassigned from job",
                  );
                } else {
                  const result = await assignAccountManagerToClientAction({
                    clientId,
                    accountManagerIds,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(
                    accountManagerIds.length > 0
                      ? "Account Managers updated for client"
                      : "Account Managers unassigned from client",
                  );
                }
                onOpenChange(false);
                signalLiveDataChange();
                onCompleted?.();
              });
            }}
          >
            {isUnassign
              ? hadAssignment
                ? "Unassign"
                : "Save (unassigned)"
              : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
