import type { AtsPack } from "./index";

interface PackRule {
  test: (sig: import("../../../shared/types").FieldSignature) => boolean;
  fills_with: import("../../../shared/types").FillKind;
  tags?: string[];
}

const RULES: PackRule[] = [
  { test: s => s.id === "first_name" || /first_name/.test(s.name),
    fills_with: { kind: "profile_path", path: "personal.first_name" } },
  { test: s => s.id === "last_name" || /last_name/.test(s.name),
    fills_with: { kind: "profile_path", path: "personal.last_name" } },
  { test: s => s.id === "email" || /\bemail\b/.test(s.name),
    fills_with: { kind: "profile_path", path: "personal.email" } },
  { test: s => s.id === "phone" || /\bphone\b/.test(s.name),
    fills_with: { kind: "profile_path", path: "personal.phone" } },
  { test: s => /linkedin/i.test(s.name) || /linkedin/i.test(s.label),
    fills_with: { kind: "profile_path", path: "personal.linkedin_url" } },
  { test: s => /website|portfolio/i.test(s.name) || /website|portfolio/i.test(s.label),
    fills_with: { kind: "profile_path", path: "personal.portfolio_url" } },
  { test: s => /cover_letter/i.test(s.name),
    fills_with: { kind: "snippet_id", id: "" }, tags: ["cover-letter"] },
];

export const greenhousePack: AtsPack = {
  name: "greenhouse",
  matches(host: string): boolean {
    return host === "greenhouse.io" || host.endsWith(".greenhouse.io");
  },
  match(sig) {
    for (const r of RULES) {
      if (r.test(sig)) return { fills_with: r.fills_with, tags: r.tags };
    }
    return null;
  },
};
