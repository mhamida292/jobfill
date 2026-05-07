import type { AtsPack } from "./index";

export const ashbyPack: AtsPack = {
  name: "ashby",
  matches(host) { return host === "ashbyhq.com" || host.endsWith(".ashbyhq.com"); },
  match(sig) {
    const n = sig.name;
    if (/_systemfield_name$/.test(n))     return { fills_with: { kind: "profile_path", path: "personal.full_name" } };
    if (/_systemfield_email$/.test(n))    return { fills_with: { kind: "profile_path", path: "personal.email" } };
    if (/_systemfield_phone/.test(n))     return { fills_with: { kind: "profile_path", path: "personal.phone" } };
    if (/_systemfield_linkedin/i.test(n)) return { fills_with: { kind: "profile_path", path: "personal.linkedin_url" } };
    if (/_systemfield_github/i.test(n))   return { fills_with: { kind: "profile_path", path: "personal.github_url" } };
    if (/_systemfield_website/i.test(n))  return { fills_with: { kind: "profile_path", path: "personal.portfolio_url" } };
    return null;
  },
};
