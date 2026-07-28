"use client";

import { useState, useTransition } from "react";
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
import { assignAccountManagerToClientAction } from "@/features/account-managers/actions/account-managers.actions";
import type { LookupOption } from "@/services/lookups";

interface AssignAccountManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: LookupOption[];
  accountManagers: LookupOption[];
  /** Pre-select a client when opened from a client row. */
  initialClientId?: string;
  /** Pre-select an AM when opened from the AM directory. */
  initialAccountManagerId?: string;
  onCompleted?: () => void;
}

/**
 * Allocate an Account Manager to a Client (Clients.Account Owner).
 * Jobs under that client inherit AM ownership in client-compat mode.
 */
export function AssignAccountManagerDialog({
  open,
  onOpenChange,
  clients,
  accountManagers,
  initialClientId = "",
  initialAccountManagerId = "",
  onCompleted,
}: AssignAccountManagerDialogProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [accountManagerId, setAccountManagerId] = useState(
    initialAccountManagerId,
  );
  const [pending, startTransition] = useTransition();

  function resetAndClose() {
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setClientId(initialClientId);
          setAccountManagerId(initialAccountManagerId);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Account Manager</DialogTitle>
          <DialogDescription>
            Link an Account Manager to a client. That AM owns the client and
            sees all jobs under it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="assign-am-client">Client</Label>
            <Select
              id="assign-am-client"
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
          <div className="space-y-2">
            <Label htmlFor="assign-am-user">Account Manager</Label>
            <Select
              id="assign-am-user"
              value={accountManagerId}
              onChange={(e) => setAccountManagerId(e.target.value)}
            >
              <option value="">Select account manager</option>
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
            disabled={!clientId || !accountManagerId || pending}
            onClick={() => {
              startTransition(async () => {
                const result = await assignAccountManagerToClientAction({
                  clientId,
                  accountManagerId,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success("Account Manager assigned to client");
                onOpenChange(false);
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
