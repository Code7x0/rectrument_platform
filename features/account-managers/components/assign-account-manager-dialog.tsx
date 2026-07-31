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
  /** Pre-select an AM. */
  initialAccountManagerId?: string;
  onCompleted?: () => void;
}

/**
 * Assign or unassign Account Manager — Admin / Super Admin.
 * - Client: sets or clears Clients.Account Owner (all unmarked jobs inherit).
 * - Job: sets per-job AM only — does not reassign the whole client.
 */
export function AssignAccountManagerDialog({
  open,
  onOpenChange,
  clients,
  accountManagers,
  target = null,
  initialClientId = "",
  initialAccountManagerId = "",
  onCompleted,
}: AssignAccountManagerDialogProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [accountManagerId, setAccountManagerId] = useState(
    initialAccountManagerId,
  );
  const [pending, startTransition] = useTransition();

  const isJob = target?.kind === "job";
  const isClientLocked =
    target?.kind === "client" || (isJob && Boolean(target.clientId));

  useEffect(() => {
    if (!open) {
      return;
    }
    if (target?.kind === "client") {
      setClientId(target.clientId);
      setAccountManagerId(initialAccountManagerId);
      return;
    }
    if (target?.kind === "job") {
      setClientId(target.clientId ?? "");
      setAccountManagerId(
        target.accountManagerId ?? initialAccountManagerId,
      );
      return;
    }
    setClientId(initialClientId);
    setAccountManagerId(initialAccountManagerId);
  }, [open, target, initialClientId, initialAccountManagerId]);

  function resetAndClose() {
    onOpenChange(false);
  }

  const canSubmit = isJob
    ? Boolean(target?.kind === "job") && Boolean(accountManagerId)
    : Boolean(clientId) && Boolean(accountManagerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isJob
              ? "Account Manager for job"
              : "Account Manager for client"}
          </DialogTitle>
          <DialogDescription>
            {isJob
              ? "Assign this Account Manager to this job only. Other jobs for the same client are not affected."
              : "Assign an Account Manager as the client Account Owner. Jobs without a specific job-level AM will follow this owner."}
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
            <Label htmlFor="assign-am-user">Account Manager ID *</Label>
            <Select
              id="assign-am-user"
              value={accountManagerId}
              onChange={(e) => setAccountManagerId(e.target.value)}
            >
              <option value="">Select Account Manager ID</option>
              {accountManagers.map((am) => (
                <option key={am.id} value={am.id}>
                  {am.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || pending}
            onClick={() => {
              startTransition(async () => {
                const nextAm = accountManagerId.trim();
                if (!nextAm) {
                  toast.error("Account Manager ID is required");
                  return;
                }
                if (isJob && target?.kind === "job") {
                  const result = await assignAccountManagerToJobAction({
                    jobId: target.jobId,
                    accountManagerId: nextAm,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Account Manager assigned to job");
                } else {
                  const result = await assignAccountManagerToClientAction({
                    clientId,
                    accountManagerId: nextAm,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Account Manager assigned to client");
                }
                onOpenChange(false);
                signalLiveDataChange();
                onCompleted?.();
              });
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
