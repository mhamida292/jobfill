import type { AtsPack } from "./index";
import type { FieldSignature, FillKind } from "../../../shared/types";

// Workday tags inputs with stable identifiers like
// data-automation-id="formField-firstName" or "formField-gender". Match these
// first since they're the most reliable signal Workday gives us.
const AUTOMATION_ID_RULES: Array<[RegExp, FillKind]> = [
  [/firstName$/i,        { kind: "profile_path", path: "personal.first_name" }],
  [/lastName$/i,         { kind: "profile_path", path: "personal.last_name" }],
  [/email/i,             { kind: "profile_path", path: "personal.email" }],
  [/phone/i,             { kind: "profile_path", path: "personal.phone" }],
  [/addressLine1|streetAddress/i, { kind: "profile_path", path: "personal.address_line1" }],
  [/^city$|formField-city/i, { kind: "profile_path", path: "personal.city" }],
  [/postalCode|zip/i,    { kind: "profile_path", path: "personal.postal_code" }],
  [/^country/i,          { kind: "profile_path", path: "personal.country" }],
  [/linkedin/i,          { kind: "profile_path", path: "personal.linkedin_url" }],
  [/gender/i,            { kind: "profile_path", path: "personal.gender" }],
  [/(ethnicity|race)/i,  { kind: "profile_path", path: "personal.race" }],
  [/veteran/i,           { kind: "profile_path", path: "personal.veteran_status" }],
  [/disability/i,        { kind: "profile_path", path: "personal.disability_status" }],
];

export const workdayPack: AtsPack = {
  name: "workday",
  matches(host) {
    return host.endsWith("myworkdayjobs.com")
        || host.endsWith("myworkday.com")
        || host.includes(".wd1.")
        || host.includes(".wd5.");
  },
  match(sig: FieldSignature) {
    const aid = sig.data_automation_id;
    if (aid) {
      for (const [rx, fills_with] of AUTOMATION_ID_RULES) {
        if (rx.test(aid)) return { fills_with };
      }
    }
    const n = sig.name;
    if (/firstName/i.test(n))  return { fills_with: { kind: "profile_path", path: "personal.first_name" } };
    if (/lastName/i.test(n))   return { fills_with: { kind: "profile_path", path: "personal.last_name" } };
    if (/^email$/i.test(n) || /emailAddress/i.test(n))
      return { fills_with: { kind: "profile_path", path: "personal.email" } };
    if (/phone/i.test(n))      return { fills_with: { kind: "profile_path", path: "personal.phone" } };
    if (/addressLine1|streetAddress/i.test(n))
      return { fills_with: { kind: "profile_path", path: "personal.address_line1" } };
    if (/^city$/i.test(n))     return { fills_with: { kind: "profile_path", path: "personal.city" } };
    if (/postalCode/i.test(n)) return { fills_with: { kind: "profile_path", path: "personal.postal_code" } };
    return null;
  },
};
