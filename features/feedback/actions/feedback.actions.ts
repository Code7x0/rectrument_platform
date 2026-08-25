"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import {
  createPartnerQuery,
  listPartnerQueries,
  listQueriesForPartner,
  answerPartnerQuery,
} from "@/features/feedback/services/partner-queries.service";
import type { PartnerQuery } from "@/features/feedback/types";
import {
  requireRole,
  resolveAccountManagerScopeId,
  resolvePartnerScopeId,
} from "@/lib/auth";
import { getOptionalEnv } from "@/lib/api/env";
import { sendEmailSafe } from "@/services/email";
import { getUserById } from "@/services/users";

const feedbackSchema = z.object({
  type: z.enum(["feedback", "suggestion", "account_question"]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
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

function feedbackTypeLabel(type: FeedbackFormValues["type"]): string {
  switch (type) {
    case "account_question":
      return "Account question";
    case "suggestion":
      return "Suggestion";
    default:
      return "Feedback";
  }
}

function revalidateFeedbackPaths() {
  revalidatePath("/partner/feedback");
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
  return listPartnerQueries();
}

export async function submitFeedbackAction(
  raw: FeedbackFormValues,
): Promise<FeedbackActionResult> {
  try {
    const session = await requireRole(["partner", "account_manager"]);
    const parsed = feedbackSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => issue.message),
      };
    }

    const roleLabel =
      session.role === "partner" ? "Talent Partner" : "Account Manager";

    let submitterName = roleLabel;
    let submitterEmail = "";
    let partnerCode = "";

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
      partnerCode = partner?.partnerCode?.trim() || partnerId;
      // Partners: identify by Partner ID only — do not expose commercial name.
      submitterName = partnerCode;
      submitterEmail = "";

      await createPartnerQuery({
        partnerId,
        partnerCode,
        accountManagerId: null,
        type: parsed.data.type,
        message: parsed.data.message,
      });
    } else {
      const user = await getUserById(session.userId);
      submitterName = user?.fullName ?? roleLabel;
      submitterEmail = user?.email ?? "";
    }

    const recipients = parseRecipients();
    if (session.role === "account_manager" && recipients.length === 0) {
      return {
        success: false,
        message:
          "Feedback is not set up yet. Please email your team lead, or try again later.",
      };
    }

    if (recipients.length > 0) {
      const typeLabel = feedbackTypeLabel(parsed.data.type);
      const results = await Promise.all(
        recipients.map((to) =>
          sendEmailSafe({
            to,
            template: "feedback_submission",
            subject: `Platform ${typeLabel} from ${roleLabel}${
              partnerCode ? ` (${partnerCode})` : ""
            }`,
            data: {
              roleLabel,
              submitterName,
              submitterEmail,
              partnerCode,
              feedbackType: typeLabel,
              message: parsed.data.message,
            },
          }),
        ),
      );

      if (
        session.role === "account_manager" &&
        results.every((row) => row == null)
      ) {
        return {
          success: false,
          message:
            "We could not send your note just now. Please try again in a few minutes.",
        };
      }
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
