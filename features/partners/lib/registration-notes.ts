/**
 * Parse registration metadata embedded in Partners.Performance Notes.
 * Used on the locked client base which has no dedicated State / Experience /
 * Bank Details / Identity Visibility columns.
 */

import type { IdentityVisibility } from "@/features/shared/entities/partner.entity";
import { isIndianStateOrUT } from "@/lib/india/states";
import { isRecruitmentExperience } from "@/features/users/lib/recruitment-experience";

export interface PartnerRegistrationNotesMeta {
  state: string | null;
  experience: string | null;
  bankDetails: string | null;
  identityVisibility: IdentityVisibility | null;
  termsAccepted: boolean;
}

function captureLine(notes: string, label: string): string | null {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "im");
  const match = re.exec(notes);
  const value = match?.[1]?.trim();
  return value || null;
}

export function parsePartnerRegistrationNotes(
  notes: string | null | undefined,
): PartnerRegistrationNotesMeta {
  if (!notes?.trim()) {
    return {
      state: null,
      experience: null,
      bankDetails: null,
      identityVisibility: null,
      termsAccepted: false,
    };
  }

  const stateRaw = captureLine(notes, "State");
  const experienceRaw = captureLine(notes, "Experience");
  const bankRaw = captureLine(notes, "Bank");
  const visibilityRaw = captureLine(notes, "Identity visibility preference");
  const termsRaw = captureLine(notes, "Terms accepted");

  let identityVisibility: IdentityVisibility | null = null;
  if (visibilityRaw?.toLowerCase() === "public") {
    identityVisibility = "public";
  } else if (visibilityRaw?.toLowerCase() === "private") {
    identityVisibility = "private";
  }

  return {
    state: stateRaw && isIndianStateOrUT(stateRaw) ? stateRaw : stateRaw,
    experience:
      experienceRaw && isRecruitmentExperience(experienceRaw)
        ? experienceRaw
        : experienceRaw,
    bankDetails: bankRaw,
    identityVisibility,
    termsAccepted: /^(yes|true|accepted)$/i.test(termsRaw ?? ""),
  };
}

export function buildPartnerRegistrationNotes(input: {
  experience: string;
  state: string;
  skills?: string;
  bankDetails?: string;
  identityVisibility: IdentityVisibility;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
}): string {
  return [
    "Self-registered Talent Partner.",
    `Experience: ${input.experience}`,
    `State: ${input.state}`,
    input.skills ? `Skills: ${input.skills}` : null,
    input.bankDetails?.trim() ? `Bank: ${input.bankDetails.trim()}` : null,
    `Identity visibility preference: ${input.identityVisibility}`,
    `Terms accepted: ${input.termsAccepted ? "yes" : "no"}`,
    input.termsAcceptedAt
      ? `Terms accepted at: ${input.termsAcceptedAt}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Soft-update identity visibility line inside Performance Notes (client base). */
export function mergeIdentityVisibilityIntoNotes(
  notes: string | null | undefined,
  visibility: IdentityVisibility,
): string {
  const line = `Identity visibility preference: ${visibility}`;
  const existing = notes?.trim() ?? "";
  if (!existing) {
    return line;
  }
  if (/^Identity visibility preference:\s*.+$/im.test(existing)) {
    return existing.replace(
      /^Identity visibility preference:\s*.+$/im,
      line,
    );
  }
  return `${existing}\n${line}`;
}
