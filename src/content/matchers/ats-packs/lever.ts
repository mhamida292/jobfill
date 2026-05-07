import type { AtsPack } from "./index";

export const leverPack: AtsPack = {
  name: "lever",
  matches(host: string) { return host.endsWith("lever.co"); },
  match(sig) {
    if (sig.name === "name") return { fills_with: { kind: "profile_path", path: "personal.full_name" } };
    if (sig.name === "email") return { fills_with: { kind: "profile_path", path: "personal.email" } };
    if (sig.name === "phone") return { fills_with: { kind: "profile_path", path: "personal.phone" } };
    if (sig.name === "org")   return { fills_with: { kind: "profile_path", path: "work_history.0.company" } };
    if (sig.name === "urls[LinkedIn]") return { fills_with: { kind: "profile_path", path: "personal.linkedin_url" } };
    if (sig.name === "urls[GitHub]")   return { fills_with: { kind: "profile_path", path: "personal.github_url" } };
    if (sig.name === "urls[Portfolio]") return { fills_with: { kind: "profile_path", path: "personal.portfolio_url" } };
    if (sig.name === "comments") return { fills_with: { kind: "snippet_id", id: "" }, tags: ["additional-info"] };
    return null;
  },
};
