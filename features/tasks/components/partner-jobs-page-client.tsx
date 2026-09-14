"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PartnerAskAmPanel } from "@/features/feedback/components/partner-ask-am-panel";
import type { PartnerQuery } from "@/features/feedback/types";
import { PartnerWorkQueue } from "@/features/tasks/components/partner-work-queue";
import type { PartnerWorkTask } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

interface PartnerJobsPageClientProps {
  tasks: PartnerWorkTask[];
  queries: PartnerQuery[];
}

type JobsTab = "jobs" | "ask-am";

export function PartnerJobsPageClient({
  tasks,
  queries,
}: PartnerJobsPageClientProps) {
  const [activeTab, setActiveTab] = useState<JobsTab>("jobs");
  const [visibleCount, setVisibleCount] = useState(tasks.length);

  const title =
    activeTab === "ask-am"
      ? "Ask AM"
      : visibleCount === tasks.length
        ? `My Jobs (${tasks.length})`
        : `My Jobs (${visibleCount} of ${tasks.length})`;

  const description =
    activeTab === "ask-am"
      ? "Send job or candidate questions to your Account Manager. Replies appear in this tab and on Feedback."
      : "Active and On Hold jobs allocated to you. Open a job for details and comments. Use Submit Profile to pick a JD and submit in one step.";

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[#E2E8F0]">
        {(
          [
            { id: "jobs" as const, label: "My Jobs" },
            { id: "ask-am" as const, label: "Ask AM" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PageHeader title={title} description={description} />

      {activeTab === "jobs" ? (
        <PartnerWorkQueue tasks={tasks} onVisibleCountChange={setVisibleCount} />
      ) : (
        <PartnerAskAmPanel tasks={tasks} queries={queries} />
      )}
    </>
  );
}
