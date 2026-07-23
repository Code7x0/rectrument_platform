/**
 * Canonical Client entity — independent of Airtable field names.
 */

export type ClientStatus = "active" | "inactive" | "archived";

export interface ClientEntity {
  id: string;
  clientCode: string | null;
  name: string;
  industry: string | null;
  website: string | null;
  primaryContact: string | null;
  accountManagerId: string | null;
  accountManagerName: string | null;
  status: ClientStatus;
  notes: string | null;
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};
