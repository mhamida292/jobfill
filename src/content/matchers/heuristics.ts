import type { FieldSignature, FillKind } from "../../shared/types";

// Custom word boundary that treats letters/digits as "word" but NOT underscore,
// because ATS field names like `applicant_email` need to match `email`.
const B = "(?:^|[^a-zA-Z0-9])"; // prefix
const E = "(?=[^a-zA-Z0-9]|$)"; // suffix (lookahead, doesn't consume)

type RuleField = "label" | "name" | "id" | "placeholder" | "group_label" | "data_automation_id";

interface Rule {
  regex: RegExp;
  match: RuleField[];
  fills_with: FillKind;
  tags?: string[];
}

const RULES: Rule[] = [
  // Personal
  { regex: new RegExp(`${B}email${E}`, "i"),                    match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.email" } },
  { regex: new RegExp(`${B}(phone|tel|mobile)${E}`, "i"),       match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.phone" } },
  { regex: /first[\s_-]?name/i,                                 match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.first_name" } },
  { regex: /last[\s_-]?name/i,                                  match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.last_name" } },
  { regex: new RegExp(`${B}full[\\s_-]?name${E}`, "i"),         match: ["name","id","label","placeholder"], fills_with: { kind: "literal", value: "" } },
  { regex: /address[\s_-]?(line[\s_-]?)?1|street/i,             match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.address_line1" } },
  { regex: new RegExp(`${B}city${E}`, "i"),                     match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.city" } },
  { regex: new RegExp(`${B}(state|region|province)${E}`, "i"),  match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.state" } },
  { regex: /(zip|postal)[\s_-]?code/i,                          match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.postal_code" } },
  { regex: new RegExp(`${B}country${E}`, "i"),                  match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.country" } },
  { regex: /linkedin/i,                                         match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.linkedin_url" } },
  { regex: /github/i,                                           match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.github_url" } },
  { regex: new RegExp(`${B}(portfolio|website|personal[\\s_-]?site)${E}`, "i"), match: ["name","id","label","placeholder"], fills_with: { kind: "profile_path", path: "personal.portfolio_url" } },
  { regex: /work[\s_-]?auth(orization)?/i,                      match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.work_authorization" } },
  { regex: /(sponsor|sponsorship)/i,                            match: ["name","id","label"],                fills_with: { kind: "profile_path", path: "personal.requires_sponsorship" } },
  { regex: new RegExp(`${B}gender${E}`, "i"),                   match: ["name","id","label","group_label","data_automation_id"], fills_with: { kind: "profile_path", path: "personal.gender" } },
  { regex: new RegExp(`${B}(ethnicity|race)${E}`, "i"),         match: ["name","id","label","group_label","data_automation_id"], fills_with: { kind: "profile_path", path: "personal.race" } },
  { regex: new RegExp(`${B}veteran${E}`, "i"),                  match: ["name","id","label","group_label","data_automation_id"], fills_with: { kind: "profile_path", path: "personal.veteran_status" } },
  { regex: new RegExp(`${B}disability${E}`, "i"),               match: ["name","id","label","group_label","data_automation_id"], fills_with: { kind: "profile_path", path: "personal.disability_status" } },

  // Work history descriptions: "Describe your role", "Responsibilities", "Duties"
  // map to the most recent work history entry's description.
  { regex: /describe\s+your\s+(role|responsibilities|duties|position|work)/i,
    match: ["label","placeholder"],
    fills_with: { kind: "profile_path", path: "work_history.0.description" } },
  { regex: /(^|[^a-zA-Z])(responsibilities|duties|job\s+description)([^a-zA-Z]|$)/i,
    match: ["label","placeholder","name","id"],
    fills_with: { kind: "profile_path", path: "work_history.0.description" } },

  // Snippet triggers (textareas only, semantically)
  { regex: /cover[\s_-]?letter/i,                               match: ["name","id","label","placeholder"], fills_with: { kind: "snippet_id", id: "" }, tags: ["cover-letter"] },
  { regex: /why\s+(this|our|are\s+you).*(company|us|interested)/i, match: ["label","placeholder"],          fills_with: { kind: "snippet_id", id: "" }, tags: ["why-company"] },
  { regex: /why\s+(this|the).*(role|position)/i,                match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["why-role"] },
  { regex: /tell.*(about|yourself)/i,                           match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["intro"] },
  { regex: new RegExp(`${B}weakness${E}`, "i"),                 match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["behavioral", "weakness"] },
  { regex: new RegExp(`${B}strength${E}`, "i"),                 match: ["label","placeholder"],              fills_with: { kind: "snippet_id", id: "" }, tags: ["behavioral", "strength"] },
];

export interface HeuristicMatch {
  fills_with: FillKind;
  tags: string[];
}

export function matchHeuristic(sig: FieldSignature): HeuristicMatch | null {
  for (const rule of RULES) {
    for (const where of rule.match) {
      const haystack = sig[where];
      if (typeof haystack === "string" && haystack && rule.regex.test(haystack)) {
        return { fills_with: rule.fills_with, tags: rule.tags ?? [] };
      }
    }
  }
  return null;
}
