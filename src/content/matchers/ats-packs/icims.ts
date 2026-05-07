import type { AtsPack } from "./index";

export const icimsPack: AtsPack = {
  name: "icims",
  matches(host) { return host.endsWith(".icims.com"); },
  match(sig) {
    const n = sig.name;
    if (/icims_field_first/i.test(n)) return { fills_with: { kind: "profile_path", path: "personal.first_name" } };
    if (/icims_field_last/i.test(n))  return { fills_with: { kind: "profile_path", path: "personal.last_name" } };
    if (/icims_field_email/i.test(n)) return { fills_with: { kind: "profile_path", path: "personal.email" } };
    if (/icims_field_phone/i.test(n)) return { fills_with: { kind: "profile_path", path: "personal.phone" } };
    return null;
  },
};
