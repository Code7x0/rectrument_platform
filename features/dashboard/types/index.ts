/**
 * Dashboard feature types — presentation DTOs only.
 * Aggregation services map domain entities into these shapes.
 */

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  href: string;
  hint?: string;
  tone?: "default" | "attention" | "positive" | "muted";
}

export interface DashboardQuickActionItem {
  id: string;
  label: string;
  description?: string;
  href: string;
}

export interface DashboardListItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  badge?: string;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  description?: string | null;
  timestamp: string | null;
  href?: string;
}

export interface SuperAdminDashboardData {
  metrics: DashboardMetric[];
  companyHealth: DashboardMetric[];
  quickActions: DashboardQuickActionItem[];
  recentInvitations: DashboardListItem[];
  recentApprovals: DashboardListItem[];
  recentActivity: DashboardActivityItem[];
}

export interface AdminDashboardData {
  metrics: DashboardMetric[];
  quickActions: DashboardQuickActionItem[];
  recentJobs: DashboardListItem[];
  recentCandidates: DashboardListItem[];
  recentDocuments: DashboardListItem[];
  recentPayouts: DashboardListItem[];
  recentActivity: DashboardActivityItem[];
}

export interface AccountManagerDashboardData {
  metrics: DashboardMetric[];
  pipeline: DashboardMetric[];
  quickActions: DashboardQuickActionItem[];
  awaitingAction: DashboardListItem[];
  recentCandidateActivity: DashboardListItem[];
  recentPartnerActivity: DashboardListItem[];
  recentActivity: DashboardActivityItem[];
}

export interface PartnerDashboardData {
  partnerName: string;
  metrics: DashboardMetric[];
  earnings: DashboardMetric[];
  todaysWork: DashboardListItem[];
  recentEarnings: DashboardListItem[];
  recentCandidateUpdates: DashboardListItem[];
  recentActivity: DashboardActivityItem[];
  quickActions: DashboardQuickActionItem[];
}
