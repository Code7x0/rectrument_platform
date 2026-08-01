export type {
  ClientEntity as Client,
  ClientStatus,
  PartnerClientView,
} from "@/features/shared/entities";
export { CLIENT_STATUS_LABELS } from "@/features/shared/entities";

export interface CreateClientInput {
  name: string;
  /** Business Client ID (AB, TC…). Auto-allocated on create when omitted. */
  clientCode?: string;
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
  /** Scope to Clients.Account Owner (Account Managers record id). */
  accountManagerId?: string;
}

/** Calculated — never stored on Client record. */
export interface ClientWorkspaceStats {
  jobCount: number;
  partnerCount: number;
  candidateCount: number;
}
