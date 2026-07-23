"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ContentContainer } from "@/components/shared/content-container";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  changeRoleAction,
  deactivateUserAction,
  inviteStaffAction,
  resetUserAccessAction,
} from "@/features/users/actions";
import { ActivityDrawer } from "@/features/activity/components/activity-drawer";
import {
  inviteStaffSchema,
  type InviteStaffValues,
} from "@/features/users/schemas/users.schema";
import type { UserListItem } from "@/features/users/types";
import { REGISTRATION_STATUS_LABELS } from "@/features/users/types";
import { getRoleLabel } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

interface RoleManagementPageClientProps {
  users: UserListItem[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function RoleManagementPageClient({
  users: initialUsers,
  breadcrumbs,
}: RoleManagementPageClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "account_manager",
      phone: "",
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return users;
    }
    const q = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        getRoleLabel(user.role).toLowerCase().includes(q),
    );
  }, [users, search]);

  const columns: DataTableColumn<UserListItem>[] = [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <div className="font-medium text-[#0F172A]">{row.fullName}</div>
          <div className="text-xs text-[#64748B]">{row.email}</div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => <RoleBadge role={row.role} />,
    },
    {
      id: "registration",
      header: "Registration",
      cell: (row) => (
        <Badge variant="secondary">
          {REGISTRATION_STATUS_LABELS[row.registrationStatus]}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: "partner",
      header: "Partner",
      cell: (row) => row.partnerCode ?? "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        if (row.role === "super_admin") {
          return <span className="text-xs text-[#94A3B8]">Protected</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            <ActivityDrawer
              entityRef={{ kind: "user", id: row.id }}
              title={`${row.fullName} activity`}
              triggerLabel="Activity"
            />
            {row.role === "partner" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => promote(row.id, "admin")}
                >
                  → Admin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => promote(row.id, "account_manager")}
                >
                  → AM
                </Button>
              </>
            ) : null}
            {row.role === "admin" || row.role === "account_manager" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => promote(row.id, "partner")}
              >
                Demote to Partner
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await resetUserAccessAction(row.id);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Access reset — invitation queued");
                  setUsers((current) =>
                    current.map((u) => (u.id === row.id ? { ...u, ...result.data } : u)),
                  );
                });
              }}
            >
              Reset access
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || row.status === "inactive"}
              onClick={() => setDeactivateId(row.id)}
            >
              Deactivate
            </Button>
          </div>
        );
      },
    },
  ];

  function promote(userId: string, toRole: UserRole) {
    startTransition(async () => {
      const result = await changeRoleAction({ userId, toRole });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(`Role updated to ${getRoleLabel(toRole)}`);
      setUsers((current) =>
        current.map((u) => (u.id === userId ? { ...u, ...result.data } : u)),
      );
    });
  }

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Role Management"
        description="Invite staff, promote Talent Partners, deactivate users, and audit access."
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invite staff</Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={filtered} getRowId={(row) => row.id} />

      <FormDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite Admin or Account Manager"
        description="Sends an invitation email. Super Admin cannot be invited."
      >
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await inviteStaffAction(values);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Invitation queued");
              setUsers((current) => [
                {
                  ...result.data,
                  partnerCode: null,
                  partnerName: null,
                },
                ...current,
              ]);
              setInviteOpen(false);
              form.reset();
            });
          })}
        >
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input {...form.register("fullName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select {...form.register("role")}>
              <option value="account_manager">Account Manager</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input {...form.register("phone")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deactivateId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateId(null);
          }
        }}
        title="Deactivate user"
        description="The user will no longer be able to sign in."
        confirmLabel="Deactivate"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deactivateId) {
            return;
          }
          startTransition(async () => {
            const result = await deactivateUserAction(deactivateId);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("User deactivated");
            setUsers((current) =>
              current.map((u) =>
                u.id === deactivateId ? { ...u, ...result.data } : u,
              ),
            );
            setDeactivateId(null);
          });
        }}
      />
    </ContentContainer>
  );
}
