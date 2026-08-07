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
  /** @deprecated Prefer accountManagerIds. */
  accountManagerId?: string;
  /** Full Account Owner link set (multi-AM). Empty array clears ownership. */
  accountManagerIds?: string[];
  status?: import("@/features/shared/entities").ClientStatus;
  notes?: string;
  primaryAddress?: string;
  modeOfWork?: string;
  workDaysInWeek?: number | null;
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
  /** Open / on-hold jobs on this client. */
  activeRoleCount: number;
}
