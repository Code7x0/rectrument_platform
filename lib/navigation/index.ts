import type { ComponentType } from "react";
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
  Settings,
  Shield,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

import type { UserRole } from "@/types";

export interface AppNavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const SUPER_ADMIN_NAV: AppNavItem[] = [
  { title: "Workspace", href: "/super-admin", icon: Shield },
  { title: "Role Management", href: "/super-admin/users", icon: Users },
  { title: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
  { title: "Clients", href: "/admin/clients", icon: Building2 },
  { title: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { title: "Talent Partners", href: "/admin/partners", icon: Users },
  { title: "Candidates", href: "/admin/candidates", icon: ClipboardList },
  { title: "Allocations", href: "/admin/allocations", icon: FolderKanban },
  { title: "Documents", href: "/admin/documents", icon: FileText },
  { title: "Payouts", href: "/admin/payouts", icon: Wallet },
  { title: "Activity", href: "/activities", icon: History },
  { title: "Settings", href: "/settings", icon: Settings },
];

const ADMIN_NAV: AppNavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
  { title: "Clients", href: "/admin/clients", icon: Building2 },
  { title: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { title: "Talent Partners", href: "/admin/partners", icon: Users },
  { title: "Candidates", href: "/admin/candidates", icon: ClipboardList },
  { title: "Allocations", href: "/admin/allocations", icon: FolderKanban },
  {
    title: "Partner Documents",
    href: "/admin/documents",
    icon: FileText,
  },
  { title: "Payouts", href: "/admin/payouts", icon: Wallet },
  { title: "Activity", href: "/activities", icon: History },
  { title: "Settings", href: "/settings", icon: Settings },
];

const ACCOUNT_MANAGER_NAV: AppNavItem[] = [
  {
    title: "Dashboard",
    href: "/account-manager",
    icon: LayoutDashboard,
  },
  { title: "Clients", href: "/account-manager/clients", icon: Building2 },
  { title: "Jobs", href: "/account-manager/jobs", icon: Briefcase },
  {
    title: "Allocations",
    href: "/account-manager/allocations",
    icon: FolderKanban,
  },
  {
    title: "Review Queue",
    href: "/account-manager/candidates",
    icon: ClipboardList,
  },
  { title: "Payouts", href: "/account-manager/payouts", icon: Wallet },
  { title: "Activity", href: "/activities", icon: History },
  { title: "Settings", href: "/account-manager/settings", icon: Settings },
];

const PARTNER_NAV: AppNavItem[] = [
  { title: "My Work", href: "/partner", icon: ListTodo },
  { title: "Assigned Jobs", href: "/partner/jobs", icon: Briefcase },
  {
    title: "My Candidates",
    href: "/partner/candidates",
    icon: ClipboardList,
  },
  { title: "Documents", href: "/partner/documents", icon: FileText },
  { title: "My Earnings", href: "/partner/payments", icon: Wallet },
  { title: "Activity", href: "/activities", icon: History },
  { title: "Profile", href: "/partner/profile", icon: UserCircle },
];

export function getNavigationForRole(role: UserRole): AppNavItem[] {
  switch (role) {
    case "super_admin":
      return SUPER_ADMIN_NAV;
    case "admin":
      return ADMIN_NAV;
    case "account_manager":
      return ACCOUNT_MANAGER_NAV;
    case "partner":
      return PARTNER_NAV;
  }
}
