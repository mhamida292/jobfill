import type { FieldSignature, FillKind } from "../../shared/types";

interface Rule {
  regex: RegExp;
  match: ("label" | "name" | "id" | "placeholder")[];
  fills_with: FillKind;
  tags?: string[];
}

const RULES: Rule[] = [
  // Personal
  { regex: /(^|[^a-z])email([^a-z]|$)/i, match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.email" } },
  { regex: /\b(phone|tel|mobile)\b/i,    match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.phone" } },
  { regex: /first[\s_-]?name/i,          match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.first_name" } },
  { regex: /last[\s_-]?name/i,           match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.last_name" } },
  { regex: /\bfull[\s_-]?name\b/i,       match: ["name","id","label","placeholder"], fills_with: { kind: "literal", value: "" /* filled at runtime: first + last */ } },
  { regex: /address[\s_-]?(line[\s_-]?)?1|street/i, match: ["name","id","label"],   fills_with: { kind: "profile_path", path: "personal.address_line1" } },
  { regex: /\bcity\b/i,                  match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.city" } },
  { regex: /\b(state|region|province)\b/i, match: ["name","id","label"],              fills_with: { kind: "profile_path", path: "personal.state" } },
  { regex: /(zip|postal)[\s_-]?code/i,   match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.postal_code" } },
  { regex: /\bcountry\b/i,               match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.country" } },
  { regex: /linkedin/i,                  match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.linkedin_url" } },
  { regex: /github/i,                    match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.github_url" } },
  { regex: /\b(portfolio|website|personal[\s_-]?site)\b/i, match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.portfolio_url" } },
  { regex: /work[\s_-]?auth(orization)?/i, match: ["name","id","label"],              fills_with: { kind: "profile_path", path: "personal.work_authorization" } },
  { regex: /(sponsor|sponsorship)/i,     match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.requires_sponsorship" } },
  { regex: /\bgender\b/i,                match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.gender" } },
  { regex: /\bethnicity|race\b/i,        match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.race" } },
  { regex: /\bveteran\b/i,               match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.veteran_status" } },
  { regex: /\bdisability\b/i,            match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.disability_status" } },

  // Snippet triggers (textareas only, semantically)
  { regex: /cover[\s_-]?letter/i,        match: ["name","id","label","placeholder"], fills_with: { kind: "snippet_id", id: "" }, tags: ["cover-letter"] },
  { regex: /why\s+(this|our|are\s+you).*(company|us|interested)/i, match: ["label","placeholder"], fills_with: { kind: "snippet_id", id: "" }, tags: ["why-company"] },
  { regex: /why\s+(this|the).*(role|position)/i, match: ["label","placeholder"],     fills_with: { kind: "snippet_id", id: "" }, tags: ["why-role"] },
  { regex: /tell.*(about|yourself)/i,    match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["intro"] },
  { regex: /\bweakness\b/i,              match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["behavioral", "weakness"] },
  { regex: /\bstrength\b/i,              match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["behavioral", "strength"] },
];

export interface HeuristicMatch {
  fills_with: FillKind;
  tags: string[];
}

export function matchHeuristic(sig: FieldSignature): HeuristicMatch | null {
  for (const rule of RULES) {
    for (const where of rule.match) {
      const haystack = sig[where];
      if (haystack && rule.regex.test(haystack)) {
        return { fills_with: rule.fills_with, tags: rule.tags ?? [] };
      }
    }
  }
  return null;
}
