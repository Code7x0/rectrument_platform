"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import {
  createPartnerQuery,
  listQueriesForAccountManager,
  listQueriesForPartner,
  answerPartnerQuery,
} from "@/features/feedback/services/partner-queries.service";
import type { PartnerQuery } from "@/features/feedback/types";
import { PARTNER_QUERY_TYPE_LABELS } from "@/features/feedback/types";
import {
  requireRole,
  resolveAccountManagerScopeId,
  resolvePartnerScopeId,
} from "@/lib/auth";
import { getOptionalEnv } from "@/lib/api/env";
import { sendEmailSafe } from "@/services/email";
import { getUserById } from "@/services/users";

const feedbackSchema = z.object({
  type: z.enum([
    "platform_feedback",
    "job_candidate_query",
    "account_admin_query",
  ]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
  jobId: z.string().trim().optional(),
});

const replySchema = z.object({
  queryId: z.string().trim().min(1),
  amComments: z.string().trim().min(2, "Please enter a reply"),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export type FeedbackActionResult =
  | { success: true }
  | { success: false; message: string; errors?: string[] };

function parseRecipients(): string[] {
  const configured = getOptionalEnv("FEEDBACK_TO_EMAIL");
  const cc = getOptionalEnv("FEEDBACK_CC_EMAILS");
  const list = [configured, cc]
    .filter(Boolean)
    .flatMap((value) =>
      String(value)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
  return [...new Set(list.map((value) => value.toLowerCase()))];
}

function revalidateFeedbackPaths() {
  revalidatePath("/partner/feedback");
  revalidatePath("/partner/jobs");
  revalidatePath("/account-manager/feedback");
}

export async function listPartnerFeedbackQueriesAction(): Promise<
  PartnerQuery[]
> {
  const session = await requireRole(["partner", "account_manager"]);
  if (session.role === "partner") {
    const partnerId = resolvePartnerScopeId(session);
    if (!partnerId) {
      return [];
    }
    return listQueriesForPartner(partnerId);
  }
  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    return [];
  }
  return listQueriesForAccountManager(accountManagerId);
}

export async function submitFeedbackAction(
  raw: FeedbackFormValues,
): Promise<FeedbackActionResult> {
  try {
    const session = await requireRole(["partner", "admin", "super_admin"]);
    const parsed = feedbackSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const typeLabel = PARTNER_QUERY_TYPE_LABELS[parsed.data.type];

    if (session.role === "partner") {
      const partnerId = resolvePartnerScopeId(session);
      if (!partnerId) {
        return {
          success: false,
          message: "Partner profile not found for this account.",
        };
      }
      const { getPartnerById } = await import("@/features/partners/services");
      const partner = await getPartnerById(partnerId);
      const partnerCode = partner?.partnerCode?.trim() || partnerId;

      let jobTitle: string | null = null;
      let accountManagerId: string | null = null;
      if (parsed.data.jobId) {
        const { getJobById } = await import("@/features/jobs/services");
        const job = await getJobById(parsed.data.jobId);
        jobTitle = job?.title?.trim() ?? null;
        accountManagerId =
          job?.accountManagerId?.trim() ||
          job?.accountManagerIds?.[0]?.trim() ||
          null;
      }

      const message =
        jobTitle && !parsed.data.message.includes(jobTitle)
          ? `Job: ${jobTitle}\n\n${parsed.data.message}`
          : parsed.data.message;

      await createPartnerQuery({
        partnerId,
        partnerCode,
        accountManagerId,
        type: parsed.data.type,
        message,
      });

      const { notifyPartnerQuerySubmitted } = await import(
        "@/features/notifications/services/notification-events"
      );
      await notifyPartnerQuerySubmitted({
        partnerId,
        partnerCode,
        message,
        type: parsed.data.type,
        typeLabel,
        jobTitle,
        jobId: parsed.data.jobId ?? null,
        accountManagerId,
      });

      revalidateFeedbackPaths();
      return { success: true };
    }

    const roleLabel =
      session.role === "super_admin" ? "Super Admin" : "Admin";
    const user = await getUserById(session.userId);
    const submitterName = user?.fullName ?? roleLabel;
    const submitterEmail = user?.email ?? "";

    const recipients = parseRecipients();
    if (recipients.length === 0) {
      return {
        success: false,
        message:
          "Feedback is not set up yet. Please email your team lead, or try again later.",
      };
    }

    const results = await Promise.all(
      recipients.map((to) =>
        sendEmailSafe({
          to,
          template: "feedback_submission",
          subject: `Platform ${typeLabel} from ${roleLabel}`,
          data: {
            roleLabel,
            submitterName,
            submitterEmail,
            partnerCode: "",
            feedbackType: typeLabel,
            message: parsed.data.message,
          },
        }),
      ),
    );

    if (results.every((row) => row == null)) {
      return {
        success: false,
        message:
          "We could not send your note just now. Please try again in a few minutes.",
      };
    }

    revalidateFeedbackPaths();
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Unable to submit feedback right now. Please try again later.",
    };
  }
}

export async function replyToPartnerQueryAction(
  raw: z.infer<typeof replySchema>,
): Promise<FeedbackActionResult> {
  try {
    const session = await requireRole(["account_manager"]);
    const parsed = replySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const { getPartnerQueryById } = await import(
      "@/features/feedback/services/partner-queries.service"
    );
    const query = await getPartnerQueryById(parsed.data.queryId);
    if (!query || query.type !== "job_candidate_query") {
      return {
        success: false,
        message: "This query cannot be answered from your inbox.",
      };
    }

    await answerPartnerQuery(parsed.data.queryId, {
      amComments: parsed.data.amComments,
      answeredByUserId: session.userId,
      accountManagerId: resolveAccountManagerScopeId(session),
      status: "answered",
    });

    revalidateFeedbackPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to send reply right now. Please try again later.";
    return { success: false, message };
  }
}
