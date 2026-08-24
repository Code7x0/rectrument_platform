import type { SkillScreenRow } from "@/features/candidates/schemas/candidate.schema";

export function buildScreeningMatrixNotes(input: {
  experience?: string | null;
  skillScreens?: SkillScreenRow[] | null;
  offerInHand?: {
    ctc?: string | null;
    location?: string | null;
    doj?: string | null;
    company?: string | null;
    reason?: string | null;
  } | null;
  remarks?: string | null;
}): string {
  const experience = input.experience?.trim() ?? "";
  const extra = input.remarks?.trim() ?? "";
  const offerInHand = {
    ctc: input.offerInHand?.ctc?.trim() ?? "",
    location: input.offerInHand?.location?.trim() ?? "",
    doj: input.offerInHand?.doj?.trim() ?? "",
    company: input.offerInHand?.company?.trim() ?? "",
    reason: input.offerInHand?.reason?.trim() ?? "",
  };
  const skillLines: string[] = [];

  for (const row of input.skillScreens ?? []) {
    const skill = row.skill?.trim() ?? "";
    const years = row.years?.trim() ?? "";
    const alternate = row.alternate?.trim() ?? "";
    if (!skill && !years && !alternate) {
      continue;
    }
    if (skill && alternate) {
      skillLines.push(
        `- ${skill} — not using; alternate: ${alternate}${years ? ` (${years})` : ""}`,
      );
    } else if (skill && years) {
      skillLines.push(`- ${skill} — ${years}`);
    } else if (skill) {
      skillLines.push(`- ${skill}`);
    } else if (alternate && years) {
      skillLines.push(`- alternate: ${alternate} (${years})`);
    } else if (alternate) {
      skillLines.push(`- alternate: ${alternate}`);
    } else {
      skillLines.push(`- ${years}`);
    }
  }

  const lines: string[] = [];
  if (experience) {
    lines.push(`Total experience: ${experience}`);
  }
  if (skillLines.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Skill screen:", ...skillLines);
  }
  const hasOfferInHand = Object.values(offerInHand).some(Boolean);
  if (hasOfferInHand) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Offer in hand:");
    if (offerInHand.ctc) {
      lines.push(`- CTC: ${offerInHand.ctc}`);
    }
    if (offerInHand.location) {
      lines.push(`- Location: ${offerInHand.location}`);
    }
    if (offerInHand.doj) {
      lines.push(`- DOJ: ${offerInHand.doj}`);
    }
    if (offerInHand.company) {
      lines.push(`- Company: ${offerInHand.company}`);
    }
    if (offerInHand.reason) {
      lines.push(`- Reason: ${offerInHand.reason}`);
    }
  }
  if (extra) {
    if (lines.length > 0) {
      lines.push("");
      lines.push("Additional notes:", extra);
    } else {
      lines.push(extra);
    }
  }

  return lines.join("\n").trim();
}

export function parseScreeningMatrixNotes(notes: string | null | undefined): {
  experience: string;
  skillScreens: SkillScreenRow[];
  offerInHand: {
    ctc: string;
    location: string;
    doj: string;
    company: string;
    reason: string;
  };
  remarks: string;
} {
  const text = notes?.trim() ?? "";
  if (!text) {
    return {
      experience: "",
      skillScreens: [{ skill: "", years: "", alternate: "" }],
      offerInHand: {
        ctc: "",
        location: "",
        doj: "",
        company: "",
        reason: "",
      },
      remarks: "",
    };
  }

  const experienceMatch = /^Total experience:\s*(.+)$/m.exec(text);
  const experience = experienceMatch?.[1]?.trim() ?? "";

  const skillScreens: SkillScreenRow[] = [];
  const skillBlockMatch =
    /Skill screen:\n([\s\S]*?)(?:\n\nOffer in hand:|\n\nAdditional notes:|\s*$)/.exec(
      text,
    );
  const skillBlock = skillBlockMatch?.[1] ?? "";
  for (const line of skillBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      continue;
    }
    const body = trimmed.slice(2);
    const alternateMatch =
      /^(.+?)\s+—\s+not using;\s+alternate:\s+(.+?)(?:\s+\((.+)\))?$/i.exec(
        body,
      );
    if (alternateMatch) {
      skillScreens.push({
        skill: alternateMatch[1]?.trim() ?? "",
        years: alternateMatch[3]?.trim() ?? "",
        alternate: alternateMatch[2]?.trim() ?? "",
      });
      continue;
    }
    const directMatch = /^(.+?)\s+—\s+(.+)$/.exec(body);
    if (directMatch) {
      skillScreens.push({
        skill: directMatch[1]?.trim() ?? "",
        years: directMatch[2]?.trim() ?? "",
        alternate: "",
      });
      continue;
    }
    if (/^alternate:\s+/i.test(body)) {
      const altOnly =
        /^alternate:\s+(.+?)(?:\s+\((.+)\))?$/i.exec(body);
      skillScreens.push({
        skill: "",
        years: altOnly?.[2]?.trim() ?? "",
        alternate: altOnly?.[1]?.trim() ?? body,
      });
      continue;
    }
    skillScreens.push({ skill: body, years: "", alternate: "" });
  }

  const offerBlockMatch =
    /Offer in hand:\n([\s\S]*?)(?:\n\nAdditional notes:|\s*$)/.exec(text);
  const offerBlock = offerBlockMatch?.[1] ?? "";
  const offerInHand = {
    ctc: "",
    location: "",
    doj: "",
    company: "",
    reason: "",
  };
  for (const line of offerBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      continue;
    }
    const body = trimmed.slice(2);
    const [rawLabel, ...rest] = body.split(":");
    const value = rest.join(":").trim();
    switch ((rawLabel ?? "").trim().toLowerCase()) {
      case "ctc":
        offerInHand.ctc = value;
        break;
      case "location":
        offerInHand.location = value;
        break;
      case "doj":
        offerInHand.doj = value;
        break;
      case "company":
        offerInHand.company = value;
        break;
      case "reason":
        offerInHand.reason = value;
        break;
    }
  }

  const additionalMatch = /Additional notes:\n([\s\S]*)$/.exec(text);
  const structured = Boolean(
    experience ||
      skillScreens.length > 0 ||
      Object.values(offerInHand).some(Boolean),
  );
  const remarks = structured
    ? (additionalMatch?.[1]?.trim() ?? "")
    : text;

  return {
    experience,
    offerInHand,
    skillScreens:
      skillScreens.length > 0
        ? skillScreens
        : [{ skill: "", years: "", alternate: "" }],
    remarks,
  };
}

export function formatSkillScreensForDisplay(
  rows: SkillScreenRow[] | null | undefined,
): string | null {
  const parts: string[] = [];
  for (const row of rows ?? []) {
    const skill = row.skill?.trim() ?? "";
    const years = row.years?.trim() ?? "";
    const alternate = row.alternate?.trim() ?? "";
    if (!skill && !years && !alternate) {
      continue;
    }
    if (skill && alternate) {
      parts.push(
        `${skill} (not using; alt: ${alternate}${years ? `, ${years}` : ""})`,
      );
    } else if (skill && years) {
      parts.push(`${skill} (${years})`);
    } else if (skill) {
      parts.push(skill);
    } else if (alternate) {
      parts.push(`alt: ${alternate}${years ? ` (${years})` : ""}`);
    } else {
      parts.push(years);
    }
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatOfferInHandForDisplay(offer: {
  ctc?: string | null;
  location?: string | null;
  doj?: string | null;
  company?: string | null;
  reason?: string | null;
} | null | undefined): string | null {
  if (!offer) {
    return null;
  }
  const parts: string[] = [];
  if (offer.ctc?.trim()) {
    parts.push(`CTC ${offer.ctc.trim()}`);
  }
  if (offer.location?.trim()) {
    parts.push(offer.location.trim());
  }
  if (offer.doj?.trim()) {
    parts.push(`DOJ ${offer.doj.trim()}`);
  }
  if (offer.company?.trim()) {
    parts.push(offer.company.trim());
  }
  if (offer.reason?.trim()) {
    parts.push(offer.reason.trim());
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
