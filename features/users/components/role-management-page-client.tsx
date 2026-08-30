"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  permanentDeleteUserAction,
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

const ASSIGNABLE_ROLES: UserRole[] = [
  "admin",
  "account_manager",
  "partner",
];

interface RoleManagementPageClientProps {
  users: UserListItem[];
  breadcrumbs: Array<{ label: string; href?: string }>;
  title?: string;
  description?: string;
}

export function RoleManagementPageClient({
  users: initialUsers,
  breadcrumbs,
  title = "Role Management",
  description = "Change roles, invite staff, deactivate users, and permanently delete inactive accounts.",
}: RoleManagementPageClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});

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

  function refreshUsers() {
    router.refresh();
  }

  function changeRole(userId: string, toRole: UserRole) {
    startTransition(async () => {
      const result = await changeRoleAction({ userId, toRole });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(`Role updated to ${getRoleLabel(toRole)}`);
      setUsers((current) => {
        const withoutOld = current.filter((row) => row.id !== userId);
        return [
          {
            ...result.data,
            partnerCode:
              result.data.partnerId
                ? current.find((row) => row.id === userId)?.partnerCode ?? null
                : null,
            partnerName:
              result.data.partnerId
                ? current.find((row) => row.id === userId)?.partnerName ?? null
                : null,
          },
          ...withoutOld,
        ];
      });
      refreshUsers();
    });
  }

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
        const draftRole = roleDrafts[row.id] ?? row.role;
        return (
          <div className="flex min-w-[18rem] flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={draftRole}
                onChange={(event) =>
                  setRoleDrafts((current) => ({
                    ...current,
                    [row.id]: event.target.value as UserRole,
                  }))
                }
                disabled={pending}
                className="min-w-[10rem]"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || draftRole === row.role}
                onClick={() => changeRole(row.id, draftRole)}
              >
                Change role
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActivityDrawer
                entityRef={{ kind: "user", id: row.id }}
                title={`${row.fullName} activity`}
                triggerLabel="Activity"
              />
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
                      current.map((u) =>
                        u.id === row.id ? { ...u, ...result.data } : u,
                      ),
                    );
                  });
                }}
              >
                Reset access
              </Button>
              {row.status === "active" ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setDeactivateId(row.id)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    setDeleteTarget(row);
                    setDeleteEmail("");
                  }}
                >
                  Delete permanently
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title={title}
        description={description}
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
        description="Sends an invitation for new users. If the email already exists, the account is converted to the selected role instead."
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
              toast.success(
                users.some(
                  (row) =>
                    row.email.trim().toLowerCase() ===
                    values.email.trim().toLowerCase(),
                )
                  ? "Role updated"
                  : "Invitation queued",
              );
              setUsers((current) => {
                const email = values.email.trim().toLowerCase();
                const without = current.filter(
                  (row) => row.email.trim().toLowerCase() !== email,
                );
                return [
                  {
                    ...result.data,
                    partnerCode: null,
                    partnerName: null,
                  },
                  ...without,
                ];
              });
              setInviteOpen(false);
              form.reset();
              refreshUsers();
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
              {pending ? "Saving…" : "Save"}
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
        description="Step 1 of 2 — the user will no longer be able to sign in. You can permanently delete the account afterward."
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

      <FormDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteEmail("");
          }
        }}
        title="Delete user permanently"
        description="Step 2 of 2 — this removes the Airtable identity record and cannot be undone."
      >
        <div className="space-y-3">
          <p className="text-sm text-[#64748B]">
            Type <strong className="text-[#0F172A]">{deleteTarget?.email}</strong>{" "}
            to confirm permanent deletion of{" "}
            <strong className="text-[#0F172A]">{deleteTarget?.fullName}</strong>.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="delete-email-confirm">Confirm email</Label>
            <Input
              id="delete-email-confirm"
              value={deleteEmail}
              onChange={(event) => setDeleteEmail(event.target.value)}
              placeholder={deleteTarget?.email ?? ""}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                pending ||
                !deleteTarget ||
                deleteEmail.trim().toLowerCase() !==
                  deleteTarget.email.trim().toLowerCase()
              }
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                startTransition(async () => {
                  const result = await permanentDeleteUserAction({
                    userId: deleteTarget.id,
                    confirmEmail: deleteEmail.trim(),
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("User permanently deleted");
                  setUsers((current) =>
                    current.filter((row) => row.id !== deleteTarget.id),
                  );
                  setDeleteTarget(null);
                  setDeleteEmail("");
                  refreshUsers();
                });
              }}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </FormDialog>
    </ContentContainer>
  );
}
