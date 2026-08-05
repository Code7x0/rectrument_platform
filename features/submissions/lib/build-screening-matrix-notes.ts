import type { SkillScreenRow } from "@/features/candidates/schemas/candidate.schema";

export function buildScreeningMatrixNotes(input: {
  experience?: string | null;
  skillScreens?: SkillScreenRow[] | null;
  remarks?: string | null;
}): string {
  const experience = input.experience?.trim() ?? "";
  const extra = input.remarks?.trim() ?? "";
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
  remarks: string;
} {
  const text = notes?.trim() ?? "";
  if (!text) {
    return {
      experience: "",
      skillScreens: [{ skill: "", years: "", alternate: "" }],
      remarks: "",
    };
  }

  const experienceMatch = /^Total experience:\s*(.+)$/m.exec(text);
  const experience = experienceMatch?.[1]?.trim() ?? "";

  const skillScreens: SkillScreenRow[] = [];
  const skillBlockMatch =
    /Skill screen:\n([\s\S]*?)(?:\n\nAdditional notes:|\s*$)/.exec(text);
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

  const additionalMatch = /Additional notes:\n([\s\S]*)$/.exec(text);
  const structured = Boolean(experience || skillScreens.length > 0);
  const remarks = structured
    ? (additionalMatch?.[1]?.trim() ?? "")
    : text;

  return {
    experience,
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
