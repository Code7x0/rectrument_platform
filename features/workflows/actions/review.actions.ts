"use server";

import { actionErrorMessage } from "@/lib/actions/errors";

import { requirePermission } from "@/lib/auth";
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
    await requirePermission("view_submissions");
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return { success: false, message: "Submission not found" };
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
    return {
      success: false,
      message:
        actionErrorMessage(error, "Unable to load review detail"),
    };
  }
}
