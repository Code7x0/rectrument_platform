"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateIdentityVisibilityAction } from "@/features/users/actions";
import type { IdentityVisibility } from "@/types";
import { useState } from "react";

interface IdentityVisibilityControlProps {
  partnerId: string;
  value: IdentityVisibility;
}

export function IdentityVisibilityControl({
  partnerId,
  value,
}: IdentityVisibilityControlProps) {
  const [visibility, setVisibility] = useState(value);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
          Identity visibility
        </p>
        <Select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as IdentityVisibility)
          }
          disabled={pending}
        >
          <option value="private">Private — AM sees Partner ID only</option>
          <option value="public">Public — AM sees name</option>
        </Select>
      </div>
      <Button
        size="sm"
        disabled={pending || visibility === value}
        onClick={() => {
          startTransition(async () => {
            const result = await updateIdentityVisibilityAction({
              partnerId,
              identityVisibility: visibility,
            });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Identity visibility updated");
          });
        }}
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
