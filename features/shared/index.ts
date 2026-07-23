/**
 * Business-aware shared surface for feature modules.
 * Does not own implementations — re-exports shared primitives.
 */

export { DataTable } from "@/components/shared/data-table";
export type { DataTableColumn, DataTableProps } from "@/components/shared/data-table";

export { FormDialog } from "@/components/shared/form-dialog";
export { DetailDrawer } from "@/components/shared/detail-drawer";
export { ConfirmDialog } from "@/components/shared/confirm-dialog";
export { ArchiveDialog } from "@/components/shared/archive-dialog";
export { DeleteDialog } from "@/components/shared/delete-dialog";
export { WorkspaceShell } from "@/features/shared/workspace";
export type { WorkspaceTab } from "@/features/shared/workspace";
export {
  WorkspaceHeader,
  WorkspaceTabs,
  WorkspaceMetricCard,
  WorkspaceSection,
} from "@/features/shared/workspace";
export type { WorkspaceTabItem } from "@/features/shared/workspace";

export { EmptyState } from "@/components/shared/empty-state";
export { LoadingSkeleton } from "@/components/shared/loading-skeleton";
export { PageHeader } from "@/components/shared/page-header";
export { ContentContainer } from "@/components/shared/content-container";
export { Breadcrumb } from "@/components/shared/breadcrumb";

export {
  listClientOptions,
  listPartnerOptions,
  listAccountManagerOptions,
  lookupQueryKeys,
} from "@/services/lookups";
export type { LookupOption } from "@/services/lookups";

export type {
  AllocationEntity,
  CandidateEntity,
  ClientEntity,
  JobEntity,
  PartnerEntity,
  SubmissionEntity,
} from "./entities";
