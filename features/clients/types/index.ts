export type {
  ClientEntity as Client,
  ClientStatus,
} from "@/features/shared/entities";
export { CLIENT_STATUS_LABELS } from "@/features/shared/entities";

export interface CreateClientInput {
  name: string;
  industry?: string;
  website?: string;
  primaryContact?: string;
  accountManagerId?: string;
  status?: import("@/features/shared/entities").ClientStatus;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface ClientListFilters {
  search?: string;
  status?: import("@/features/shared/entities").ClientStatus | "all";
  includeArchived?: boolean;
}

/** Calculated — never stored on Client record. */
export interface ClientWorkspaceStats {
  jobCount: number;
  partnerCount: number;
  candidateCount: number;
}
