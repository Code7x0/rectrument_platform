import { z } from "zod";
import { candidateFormSchema } from "@/features/candidates/schemas/candidate.schema";

export const submitCandidateSchema = candidateFormSchema.extend({
  jobId: z.string().min(1),
  allocationId: z.string().min(1),
  /** When reusing an existing candidate */
  existingCandidateId: z.string().optional(),
  /** Confirm reuse after duplicate dialog */
  reuseConfirmed: z.boolean().optional(),
});

export type SubmitCandidateFormValues = z.infer<typeof submitCandidateSchema>;
