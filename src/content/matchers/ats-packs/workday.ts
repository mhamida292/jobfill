import type { AtsPack } from "./index";

export const workdayPack: AtsPack = {
  name: "workday",
  matches(host) {
    return host.endsWith("myworkdayjobs.com")
        || host.endsWith("myworkday.com")
        || host.includes(".wd1.")
        || host.includes(".wd5.");
  },
  match(sig) {
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
