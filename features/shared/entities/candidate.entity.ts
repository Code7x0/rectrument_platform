/**
 * Canonical Candidate entity — a Person.
 * Never conflate with Submission (business event).
 */

export interface CandidateEntity {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  resumeFilename: string | null;
  currentCompany: string | null;
  currentLocation: string | null;
  experience: string | null;
  currentCtc: string | null;
  expectedCtc: string | null;
  noticePeriod: string | null;
  skills: string[];
  remarks: string | null;
  createdAt: string | null;
}

export interface CreateCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentLocation?: string;
  experience?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  skills?: string[];
  remarks?: string;
}
