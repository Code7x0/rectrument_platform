export type LookupOption = {
  id: string;
  label: string;
  /** Business code when available (Partner Code, Client Code, Job ID). */
  code?: string | null;
};

export type LookupOptionsResult = LookupOption[];
