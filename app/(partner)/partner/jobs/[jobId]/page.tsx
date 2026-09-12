import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_PRIORITY_LABELS,
} from "@/features/jobs/types";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import { filterPartnerVisibleJobDocuments } from "@/features/jobs/lib/partner-visible-documents";
import { getPartnerWorkTask } from "@/features/tasks/services";
import { getAppSession, roleHasPermission } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="partner-section-label">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

function formatDaysOfWorking(days: number | null | undefined): string | null {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return null;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default async function PartnerAssignedJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "partner" || !session.partnerId) {
    redirect("/forbidden");
  }
  if (!roleHasPermission(session.role, "view_own_allocations")) {
    redirect("/forbidden");
  }

  const { jobId } = await params;
  const task = await getPartnerWorkTask(session.partnerId, jobId);
  if (!task) {
    notFound();
  }

  const job = task.job;
  const workMode = deriveJobWorkMode(job.location, job.workMode);
  const partnerDocuments = filterPartnerVisibleJobDocuments(job.documents);
  const jdDocs =
    partnerDocuments.filter((doc) => doc.label === "Job Description") ?? [];
  const sampleDocs =
    partnerDocuments.filter((doc) => doc.label === "Sample Profiling") ?? [];
  const openDate = job.postedDate || job.startDate || job.createdAt;

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "Assigned Jobs", href: "/partner/jobs" },
          { label: job.title },
        ]}
      />
      <PageHeader
        title={job.title}
        description="Standalone page for reviewing job details, attachments, and submission context."
      />

      <div className="space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          {workMode ? <Badge variant="secondary">{workMode}</Badge> : null}
          <span className="text-sm font-medium text-[#0F172A]">
            Job ID: {job.jobCode || "—"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Client" value={job.clientName} />
          <Detail label="Location" value={job.location} />
          <Detail label="Mode of Working" value={workMode} />
          <Detail
            label="Days of Working"
            value={formatDaysOfWorking(task.workDaysInWeek)}
          />
          <Detail
            label="Employment Type"
            value={
              job.employmentType
                ? EMPLOYMENT_TYPE_LABELS[job.employmentType]
                : null
            }
          />
          <Detail label="Years of Experience" value={job.experience} />
          <Detail label="Salary Range" value={job.salary} />
          <Detail
            label="Priority"
            value={job.priority ? JOB_PRIORITY_LABELS[job.priority] : null}
          />
          <Detail label="Submitted Profiles" value={task.submittedProfiles} />
          <Detail
            label="Job Open Date"
            value={openDate ? formatDate(openDate) : null}
          />
        </div>

        <div>
          <p className="partner-section-label">Additional Comments</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {job.description?.trim() || "—"}
          </p>
        </div>

        <Detail label="Interview Process R1 KYC" value={job.interviewProcess} />

        {jdDocs.length > 0 ? (
          <div>
            <p className="partner-section-label">Job Description</p>
            <ul className="mt-2 space-y-2">
              {jdDocs.map((doc) => (
                <li key={`${doc.label}-${doc.url}`}>
                  <FilePreviewLink
                    url={doc.url}
                    filename={doc.filename}
                    title={`Job Description: ${doc.filename}`}
                    className="text-sm font-medium text-success underline-offset-2 hover:underline"
                  >
                    {doc.filename}
                  </FilePreviewLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="partner-section-label">Sample Profile</p>
          {sampleDocs.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {sampleDocs.map((doc) => (
                <li key={`${doc.label}-${doc.url}`}>
                  <FilePreviewLink
                    url={doc.url}
                    filename={doc.filename}
                    title={`Sample Profile: ${doc.filename}`}
                    className="text-sm font-medium text-success underline-offset-2 hover:underline"
                  >
                    View / Download · {doc.filename}
                  </FilePreviewLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-foreground">—</p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#E2E8F0] pt-4">
          <Button asChild variant="outline">
            <Link href={`/partner/candidates?jobId=${encodeURIComponent(task.jobId)}`}>
              View My Candidates
            </Link>
          </Button>
          <Button asChild>
            <Link
              href={`/partner/submit?jobId=${encodeURIComponent(task.jobId)}`}
            >
              Submit Candidate
            </Link>
          </Button>
        </div>
      </div>
    </ContentContainer>
  );
}
