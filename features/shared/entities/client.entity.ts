/**
 * Canonical Client entity — independent of Airtable field names.
 */

export type ClientStatus = "active" | "inactive" | "archived";

export interface ClientAttachment {
  url: string;
  filename: string;
}

export interface ClientEntity {
  id: string;
  clientCode: string | null;
  name: string;
  industry: string | null;
  website: string | null;
  primaryContact: string | null;
  /** Primary Account Owner (first link) — for display / single-AM writes. */
  accountManagerId: string | null;
  /** All Account Owner links — membership checks must use this. */
  accountManagerIds: string[];
  accountManagerName: string | null;
  status: ClientStatus;
  notes: string | null;
  /** Partner-safe extras from locked Clients table (optional). */
  briefDeck?: ClientAttachment[];
  primaryAddress?: string | null;
  addresses?: string | null;
  employeeSize?: string | null;
  modeOfWork?: string | null;
  workDaysInWeek?: number | null;
}

/**
 * Projection for Talent Partners — view-only client kit (no AM / primary contact).
 */
export interface PartnerClientView {
  id: string;
  clientCode: string | null;
  name: string;
  industry: string | null;
  website: string | null;
  status: ClientStatus;
  primaryAddress: string | null;
  addresses: string | null;
  employeeSize: string | null;
  modeOfWork: string | null;
  workDaysInWeek: number | null;
  /** Airtable Clients.Notes — shown as Key Notes. */
  notes: string | null;
  briefDeck: ClientAttachment[];
  /** Jobs currently assigned to this partner under this client. */
  assignedJobTitles: string[];
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};
