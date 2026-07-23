"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AllocationListFilters } from "@/features/allocations/types";
import type { LookupOption } from "@/services/lookups";

interface AllocationFiltersProps {
  filters: AllocationListFilters;
  partners: LookupOption[];
  onChange: (next: AllocationListFilters) => void;
}

export function AllocationFilters({
  filters,
  partners,
  onChange,
}: AllocationFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <Input
        value={filters.search ?? ""}
        placeholder="Search allocation, job, partner"
        onChange={(event) =>
          onChange({ ...filters, search: event.target.value })
        }
        className="xl:col-span-2"
      />

      <Select
        value={filters.status ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            status: event.target.value as AllocationListFilters["status"],
          })
        }
      >
        <option value="all">All statuses</option>
        <option value="assigned">Assigned</option>
        <option value="working">Working</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="archived">Archived</option>
      </Select>

      <Select
        value={filters.partnerId ?? "all"}
        onChange={(event) =>
          onChange({ ...filters, partnerId: event.target.value })
        }
      >
        <option value="all">All partners</option>
        {partners.map((partner) => (
          <option key={partner.id} value={partner.id}>
            {partner.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
