/**
 * Partner registration — Experience in Recruitment/HR categories.
 * Stored as the label string in Performance Notes / domain experience.
 */

export const RECRUITMENT_EXPERIENCE_OPTIONS = [
  { value: "Fresher", label: "Fresher" },
  { value: "1–5 years", label: "1–5 years" },
  { value: "5–10 years", label: "5–10 years" },
  { value: "10+ years", label: "10+ years" },
] as const;

export type RecruitmentExperience =
  (typeof RECRUITMENT_EXPERIENCE_OPTIONS)[number]["value"];

const EXPERIENCE_SET = new Set<string>(
  RECRUITMENT_EXPERIENCE_OPTIONS.map((option) => option.value),
);

export function isRecruitmentExperience(
  value: string,
): value is RecruitmentExperience {
  return EXPERIENCE_SET.has(value.trim());
}
