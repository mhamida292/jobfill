// ---------- Profile ----------

export interface PersonalInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  work_authorization: WorkAuth;
  requires_sponsorship: boolean;
  gender: string;
  race: string;
  veteran_status: string;
  disability_status: string;
}

export type WorkAuth =
  | "us_citizen"
  | "permanent_resident"
  | "visa_h1b"
  | "visa_other"
  | "needs_sponsorship"
  | "";

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string; // "YYYY-MM"
  end_date: string;   // "YYYY-MM" or ""
  current: boolean;
  location: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  gpa: string;
}

export interface Profile {
  personal: PersonalInfo;
  work_history: WorkExperience[];
  education: Education[];
}

// ---------- Snippets ----------

export interface Snippet {
  id: string;
  label: string;
  body: string;
  tags: string[];
}

// ---------- Mappings (learned via teach mode) ----------

export interface FieldSignature {
  label: string;
  name: string;
  id: string;
  placeholder: string;
  type: string; // "text" | "email" | "tel" | "select" | "textarea" | "radio" | "checkbox" | "file" | …
  // Workday and some other ATSes tag inputs with stable identifiers
  // like data-automation-id="formField-gender". Optional for back-compat
  // with mappings stored before v0.1.1.
  data_automation_id?: string;
  // Group label for checkboxes that share a logical question (e.g., race options
  // inside a fieldset); set when a checkbox group is recognized. Empty otherwise.
  group_label?: string;
}

export type FillKind =
  | { kind: "profile_path"; path: string }   // e.g. "personal.email"
  | { kind: "snippet_id"; id: string }
  | { kind: "literal"; value: string }
  | { kind: "skip" };                         // explicitly never fill

export interface Mapping {
  field_signature: FieldSignature;
  fills_with: FillKind;
  scope: "domain" | "exact_form";
}

// ---------- Settings + meta ----------

export interface Settings {
  hotkey: string;
  auto_open_overlay: boolean;
  // Hostnames where jobfill should also run inside iframes (default: top frame only).
  iframe_domains: string[];
}

export interface Meta {
  schema_version: number;
  exported_at: string | null;
}

// ---------- Top-level storage shape ----------

export interface StorageShape {
  profile: Profile;
  snippets: Snippet[];
  mappings: Record<string, Mapping[]>; // domain → mappings
  settings: Settings;
  meta: Meta;
}

// ---------- Match results (returned by cascade) ----------

export type MatchConfidence = "high" | "medium" | "low";

export interface MatchResult {
  field_signature: FieldSignature;
  element: HTMLElement;
  fills_with: FillKind;
  confidence: MatchConfidence;
  source: "learned" | "ats_pack" | "heuristic";
  ats_pack?: string; // populated when source === "ats_pack"
}

export interface FillReport {
  filled: Array<{
    signature: FieldSignature;
    value: string;
    confidence: MatchConfidence;
    source: MatchResult["source"];
  }>;
  skipped: Array<{
    signature: FieldSignature;
    reason: string;
  }>;
  snapshot: Map<HTMLElement, string>; // for undo
}
