import type { Submission } from "@/features/submissions/types";

import {
  formatSkillScreensForDisplay,
  parseScreeningMatrixNotes,
} from "./build-screening-matrix-notes";

export type SubmissionProfile = {
  currentCompany: string | null;
  currentLocation: string | null;
  experience: string | null;
  currentCtc: string | null;
  expectedCtc: string | null;
  noticePeriod: string | null;
  skills: string | null;
  offerInHandCtc: string | null;
  offerInHandCompany: string | null;
  offerInHandLocation: string | null;
  offerInHandDoj: string | null;
  offerInHandReason: string | null;
};

function pick(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

export function resolveSubmissionProfile(row: Submission): SubmissionProfile {
  const parsed = parseScreeningMatrixNotes(row.remarks);
  const skillsFromScreens = formatSkillScreensForDisplay(parsed.skillScreens);

  return {
    currentCompany: pick(row.currentCompany, parsed.currentCompany),
    currentLocation: pick(row.currentLocation),
    experience: pick(row.experience, parsed.experience),
    currentCtc: pick(row.currentCtc),
    expectedCtc: pick(row.expectedCtc),
    noticePeriod: pick(row.noticePeriod),
    skills: pick(row.skills, skillsFromScreens),
    offerInHandCtc: pick(parsed.offerInHand.ctc),
    offerInHandCompany: pick(parsed.offerInHand.company),
    offerInHandLocation: pick(parsed.offerInHand.location),
    offerInHandDoj: pick(parsed.offerInHand.doj),
    offerInHandReason: pick(parsed.offerInHand.reason),
  };
}
