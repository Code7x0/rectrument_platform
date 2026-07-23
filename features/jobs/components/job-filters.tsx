"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { JobListFilters } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface JobFiltersProps {
  filters: JobListFilters;
  clients: LookupOption[];
  locations: string[];
  onChange: (next: JobListFilters) => void;
}

export function JobFilters({
  filters,
  clients,
  locations,
  onChange,
}: JobFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
      <Input
        value={filters.search ?? ""}
        placeholder="Search Job ID, title, client"
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
            status: event.target.value as JobListFilters["status"],
          })
        }
      >
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="on_hold">On Hold</option>
        <option value="closed">Closed</option>
        <option value="cancelled">Cancelled</option>
        <option value="filled">Filled</option>
        <option value="archived">Archived</option>
      </Select>

      <Select
        value={filters.clientId ?? "all"}
        onChange={(event) =>
          onChange({ ...filters, clientId: event.target.value })
        }
      >
        <option value="all">All clients</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.priority ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            priority: event.target.value as JobListFilters["priority"],
          })
        }
      >
        <option value="all">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>

      <Select
        value={filters.employmentType ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            employmentType: event.target
              .value as JobListFilters["employmentType"],
          })
        }
      >
        <option value="all">All employment types</option>
        <option value="full_time">Full-time</option>
        <option value="part_time">Part-time</option>
        <option value="contract">Contract</option>
        <option value="internship">Internship</option>
      </Select>

      <Select
        value={filters.location ?? "all"}
        onChange={(event) =>
          onChange({ ...filters, location: event.target.value })
        }
        className="xl:col-span-2"
      >
        <option value="all">All locations</option>
        {locations.map((location) => (
          <option key={location} value={location}>
            {location}
          </option>
        ))}
      </Select>
    </div>
  );
}
