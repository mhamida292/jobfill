import type { MatchConfidence } from "./types";

export interface SelectOption { value: string; text: string; }

const TABLE: Record<string, Record<string, string[]>> = {
  "personal.work_authorization": {
    us_citizen: ["U.S. Citizen", "US Citizen", "United States Citizen", "American Citizen"],
    permanent_resident: ["Permanent Resident", "Green Card", "Lawful Permanent Resident", "LPR"],
    visa_h1b: ["H-1B", "H1B Visa", "H1-B"],
    visa_other: ["Other Visa", "Work Visa"],
    needs_sponsorship: ["Require Sponsorship", "Need Sponsorship", "Will Require Sponsorship"],
  },
  "personal.requires_sponsorship": {
    "true":  ["Yes", "True", "I will require sponsorship"],
    "false": ["No",  "False", "I will not require sponsorship"],
  },
  "personal.gender": {
    male: ["Male", "Man"],
    female: ["Female", "Woman"],
    non_binary: ["Non-binary", "Nonbinary", "Non binary"],
    prefer_not: ["Prefer not to say", "Decline to self-identify"],
  },
  "personal.race": {
    asian: ["Asian", "Asian / Pacific Islander"],
    black: ["Black", "Black or African American", "African American"],
    white: ["White", "Caucasian", "White / Caucasian"],
    hispanic: ["Hispanic", "Hispanic or Latino", "Latino", "Latinx"],
    native_american: ["American Indian", "American Indian or Alaska Native", "Native American"],
    pacific_islander: ["Native Hawaiian", "Pacific Islander", "Native Hawaiian or Other Pacific Islander"],
    two_or_more: ["Two or More Races", "Multiracial", "Mixed"],
    prefer_not: ["Prefer not to say", "Decline to self-identify", "I do not wish to answer"],
  },
  "personal.veteran_status": {
    not_veteran: ["I am not a protected veteran", "Not a veteran"],
    veteran:     ["I identify as one or more of the classifications", "Protected veteran"],
    prefer_not:  ["I don't wish to answer", "Prefer not to disclose"],
  },
  "personal.disability_status": {
    yes:        ["Yes, I have a disability", "Yes"],
    no:         ["No, I do not have a disability", "No"],
    prefer_not: ["I do not wish to answer"],
  },
};

export interface ResolveResult {
  value: string;
  confidence: MatchConfidence;
}

export function resolveOption(
  profilePath: string,
  profileValue: string,
  options: SelectOption[],
): ResolveResult | null {
  if (!profileValue) return null;

  // 1. Exact value match (case-insensitive).
  const exact = options.find(o => o.value.toLowerCase() === profileValue.toLowerCase());
  if (exact) return { value: exact.value, confidence: "medium" };

  // 2. Synonym table → match against option text (case-insensitive, exact).
  const synonyms = TABLE[profilePath]?.[profileValue] ?? [];
  for (const syn of synonyms) {
    const hit = options.find(o => o.text.trim().toLowerCase() === syn.toLowerCase());
    if (hit) return { value: hit.value, confidence: "medium" };
  }

  // 3. Fuzzy contains: synonym substring within option text.
  for (const syn of synonyms) {
    const hit = options.find(o =>
      o.text.toLowerCase().includes(syn.toLowerCase()) && negationMatches(syn, o.text),
    );
    if (hit) return { value: hit.value, confidence: "low" };
  }

  // 4. Token-level fuzzy: all words of a synonym appear in option text.
  // Negation guard prevents "I will require sponsorship" from matching
  // an option that says "I will not require sponsorship" (and vice versa).
  for (const syn of synonyms) {
    const tokens = syn.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) continue;
    const hit = options.find(o => {
      const text = o.text.toLowerCase();
      return tokens.every(t => text.includes(t)) && negationMatches(syn, text);
    });
    if (hit) return { value: hit.value, confidence: "low" };
  }

  // 5. Profile value substring within option text (last resort).
  const fuzzy = options.find(o =>
    o.text.toLowerCase().includes(profileValue.toLowerCase()) &&
    negationMatches(profileValue, o.text),
  );
  if (fuzzy) return { value: fuzzy.value, confidence: "low" };

  return null;
}

// True when the synonym and the option agree on whether they're negated.
// Stops fuzzy steps from confusing "I will require X" with "I will not require X".
function negationMatches(syn: string, optText: string): boolean {
  return /\bnot\b/i.test(syn) === /\bnot\b/i.test(optText);
}
