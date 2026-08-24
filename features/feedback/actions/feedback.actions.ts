"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { getOptionalEnv } from "@/lib/api/env";
import { sendEmailSafe } from "@/services/email";
import { getUserById } from "@/services/users";

const feedbackSchema = z.object({
  type: z.enum(["feedback", "suggestion"]),
  message: z.string().trim().min(10, "Please enter a little more detail"),
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

    const recipients = parseRecipients();
    if (recipients.length === 0) {
      return {
        success: false,
        message:
          "Feedback is not set up yet. Please email your Account Manager, or try again later.",
      };
    }

    const user = await getUserById(session.userId);
    const roleLabel =
      session.role === "partner" ? "Talent Partner" : "Account Manager";

    const results = await Promise.all(
      recipients.map((to) =>
        sendEmailSafe({
          to,
          template: "feedback_submission",
          subject: `Platform ${parsed.data.type} from ${roleLabel}`,
          data: {
            roleLabel,
            submitterName: user?.fullName ?? roleLabel,
            submitterEmail: user?.email ?? "",
            feedbackType: parsed.data.type,
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

    revalidatePath("/partner/feedback");
    revalidatePath("/account-manager/feedback");
    return { success: true };
  } catch {
    return {
      success: false,
      message: "Unable to submit feedback right now. Please try again later.",
    };
  }
}
