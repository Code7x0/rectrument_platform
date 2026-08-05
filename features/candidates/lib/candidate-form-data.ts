import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";

export function appendCandidateFormFields(
  formData: FormData,
  values: CandidateFormValues,
) {
  formData.set("fullName", values.fullName);
  formData.set("email", values.email);
  formData.set("phone", values.phone);
  formData.set("currentLocation", values.currentLocation ?? "");
  formData.set("currentCtc", values.currentCtc ?? "");
  formData.set("expectedCtc", values.expectedCtc ?? "");
  formData.set("noticePeriod", values.noticePeriod ?? "");
  formData.set("linkedIn", values.linkedIn ?? "");
  formData.set("currentCompany", values.currentCompany ?? "");
  formData.set("experience", values.experience ?? "");
  formData.set("skills", values.skillScreens.map((row) => row.skill).join(", "));
  formData.set("remarks", values.remarks ?? "");
  formData.set("skillScreens", JSON.stringify(values.skillScreens ?? []));
}

export function parseCandidateFormData(formData: FormData) {
  let skillScreens: CandidateFormValues["skillScreens"] = [];
  try {
    const parsed = JSON.parse(String(formData.get("skillScreens") ?? "[]"));
    if (Array.isArray(parsed)) {
      skillScreens = parsed.map((row) => ({
        skill: String(row?.skill ?? ""),
        years: String(row?.years ?? ""),
        alternate: String(row?.alternate ?? ""),
      }));
    }
  } catch {
    skillScreens = [];
  }

  return {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    currentCompany: String(formData.get("currentCompany") ?? ""),
    currentLocation: String(formData.get("currentLocation") ?? ""),
    experience: String(formData.get("experience") ?? ""),
    currentCtc: String(formData.get("currentCtc") ?? ""),
    expectedCtc: String(formData.get("expectedCtc") ?? ""),
    noticePeriod: String(formData.get("noticePeriod") ?? ""),
    linkedIn: String(formData.get("linkedIn") ?? ""),
    skills: String(formData.get("skills") ?? ""),
    remarks: String(formData.get("remarks") ?? ""),
    skillScreens,
  };
}
