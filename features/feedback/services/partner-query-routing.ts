import { listActiveAllocationsForPartner } from "@/features/allocations/services";
import { getJobById } from "@/features/jobs/services";
import type { PartnerQueryType } from "@/features/feedback/types";
import {
  getAccountAdminNotificationEmails,
  getAccountManagerEmail,
  getSuperAdminNotificationEmails,
} from "@/lib/email/recipients";

export async function resolvePartnerAccountManagerIds(
  partnerId: string,
): Promise<string[]> {
  const allocations = await listActiveAllocationsForPartner(partnerId);
  const ids = new Set<string>();
  for (const row of allocations) {
    if (row.accountManagerId?.trim()) {
      ids.add(row.accountManagerId.trim());
    }
  }
  return [...ids];
}

export async function resolvePartnerAccountManagerEmails(
  partnerId: string,
): Promise<string[]> {
  const amIds = await resolvePartnerAccountManagerIds(partnerId);
  const emails: string[] = [];
  for (const amId of amIds) {
    const email = await getAccountManagerEmail(amId);
    if (email) {
      emails.push(email);
    }
  }
  return [...new Set(emails)];
}

export interface PartnerQueryRoute {
  recipients: string[];
  reviewUrl: string;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Route partner feedback to the correct inboxes — one email per submission. */
export async function resolvePartnerQueryRoute(
  type: PartnerQueryType,
  partnerId: string,
  options?: { jobId?: string | null; accountManagerId?: string | null },
): Promise<PartnerQueryRoute> {
  const base = appBaseUrl();

  switch (type) {
    case "platform_feedback":
      return {
        recipients: await getSuperAdminNotificationEmails(),
        reviewUrl: base,
      };
    case "job_candidate_query": {
      let amId = options?.accountManagerId?.trim() || null;
      if (!amId && options?.jobId?.trim()) {
        const job = await getJobById(options.jobId.trim());
        amId =
          job?.accountManagerId?.trim() ||
          job?.accountManagerIds?.[0]?.trim() ||
          null;
      }
      if (amId) {
        const email = await getAccountManagerEmail(amId);
        return {
          recipients: email ? [email] : [],
          reviewUrl: `${base}/account-manager/feedback`,
        };
      }
      return {
        recipients: await resolvePartnerAccountManagerEmails(partnerId),
        reviewUrl: `${base}/account-manager/feedback`,
      };
    }
    case "account_admin_query":
      return {
        recipients: await getAccountAdminNotificationEmails(),
        reviewUrl: `${base}/admin`,
      };
    default:
      return { recipients: [], reviewUrl: base };
  }
}
