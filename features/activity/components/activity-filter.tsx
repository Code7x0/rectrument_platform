"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ALL_ACTIVITY_ACTIONS,
  ALL_ACTIVITY_ENTITY_TYPES,
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
  type TimelineListFilters,
} from "@/features/activity/types";
import { getRoleLabel } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";

const ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "account_manager",
  "partner",
];

interface ActivityFilterProps {
  value: TimelineListFilters;
  onChange: (next: TimelineListFilters) => void;
  compact?: boolean;
}

export function ActivityFilter({
  value,
  onChange,
  compact = false,
}: ActivityFilterProps) {
  return (
    <div
      className={
        compact
          ? "grid gap-3"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      }
    >
      <div className="space-y-1.5 xl:col-span-2">
        <Label htmlFor="activity-search">Search</Label>
        <Input
          id="activity-search"
          placeholder="Search actor, action, note…"
          value={value.search ?? ""}
          onChange={(e) => onChange({ ...value, search: e.target.value, page: 1 })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-entity">Entity</Label>
        <Select
          id="activity-entity"
          value={value.entityType ?? "all"}
          onChange={(e) =>
            onChange({
              ...value,
              entityType: e.target.value as TimelineListFilters["entityType"],
              page: 1,
            })
          }
        >
          <option value="all">All entities</option>
          {ALL_ACTIVITY_ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_ENTITY_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-action">Action</Label>
        <Select
          id="activity-action"
          value={value.action ?? "all"}
          onChange={(e) =>
            onChange({
              ...value,
              action: e.target.value as TimelineListFilters["action"],
              page: 1,
            })
          }
        >
          <option value="all">All actions</option>
          {ALL_ACTIVITY_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {ACTIVITY_ACTION_LABELS[action]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-role">Actor role</Label>
        <Select
          id="activity-role"
          value={value.actorRole ?? "all"}
          onChange={(e) =>
            onChange({
              ...value,
              actorRole: e.target.value as TimelineListFilters["actorRole"],
              page: 1,
            })
          }
        >
          <option value="all">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-from">From date</Label>
        <Input
          id="activity-from"
          type="date"
          value={value.fromDate ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              fromDate: e.target.value || null,
              page: 1,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity-to">To date</Label>
        <Input
          id="activity-to"
          type="date"
          value={value.toDate ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              toDate: e.target.value || null,
              page: 1,
            })
          }
        />
      </div>
    </div>
  );
}
