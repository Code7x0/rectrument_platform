"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { requirePermission } from "@/lib/auth";
import {
  assertAccountManagerOwnsSubmission,
  isElevatedStaff,
  ScopeDeniedError,
} from "@/lib/auth/scope";
import { getCandidateById } from "@/features/candidates/services";
import { getJobById } from "@/features/jobs/services";
import { getSubmissionById } from "@/features/submissions/services";
import type { Candidate } from "@/features/candidates/types";
import type { Job } from "@/features/jobs/types";
import type { Submission } from "@/features/submissions/types";

export type ReviewDetail = {
  submission: Submission;
  candidate: Candidate | null;
  job: Job | null;
};

export async function getReviewDetailAction(
  submissionId: string,
): Promise<
  | { success: true; data: ReviewDetail }
  | { success: false; message: string }
> {
  try {
    const session = await requirePermission("view_submissions");
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return { success: false, message: "Submission not found" };
    }

    if (session.role === "account_manager") {
      await assertAccountManagerOwnsSubmission(session, submissionId);
    } else if (session.role === "partner") {
      return { success: false, message: "Forbidden" };
    } else if (!isElevatedStaff(session)) {
      return { success: false, message: "Forbidden" };
    }

    const [candidate, job] = await Promise.all([
      getCandidateById(submission.candidateId),
      getJobById(submission.jobId),
    ]);

    return {
      success: true,
      data: { submission, candidate, job },
    };
  } catch (error) {
    if (error instanceof ScopeDeniedError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load review detail"),
    };
  }
}
