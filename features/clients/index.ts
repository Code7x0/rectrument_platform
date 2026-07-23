export type {
  Client,
  ClientListFilters,
  ClientStatus,
  ClientWorkspaceStats,
  CreateClientInput,
  UpdateClientInput,
} from "./types";
export { CLIENT_STATUS_LABELS } from "./types";
export {
  archiveClient,
  createClient,
  getClientById,
  getClientWorkspaceStats,
  listClients,
  updateClient,
} from "./services";
export { ClientsPageClient, ClientDialog } from "./components";
export { ClientWorkspacePageClient } from "./workspace";
