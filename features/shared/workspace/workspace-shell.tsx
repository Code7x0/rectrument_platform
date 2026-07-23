"use client";

import type { ReactNode } from "react";

import { WorkspaceHeader } from "@/features/shared/workspace/workspace-header";
import {
  WorkspaceTabs,
  type WorkspaceTabItem,
} from "@/features/shared/workspace/workspace-tabs";
import { cn } from "@/lib/utils";

export type { WorkspaceTabItem as WorkspaceTab };

interface WorkspaceShellProps {
  title: string;
  subtitle?: string | null;
  tabs: WorkspaceTabItem[];
  activeTab: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared Workspace chrome for Client / Partner / Job / Candidate workspaces.
 */
export function WorkspaceShell({
  title,
  subtitle,
  tabs,
  activeTab,
  actions,
  children,
  className,
}: WorkspaceShellProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <WorkspaceHeader title={title} subtitle={subtitle} actions={actions} />
      <WorkspaceTabs tabs={tabs} activeTab={activeTab} />
      <div>{children}</div>
    </div>
  );
}
