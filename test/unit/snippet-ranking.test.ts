import { describe, it, expect } from "vitest";
import { rankSnippets } from "../../src/content/snippet-picker";
import type { Snippet } from "../../src/shared/types";

const snippets: Snippet[] = [
  { id: "1", label: "Why this company (SaaS)", body: "I'm interested in your SaaS product because…", tags: ["why-company", "saas"] },
  { id: "2", label: "Why this role (backend)", body: "I'm a backend engineer drawn to distributed systems…", tags: ["why-role", "backend"] },
  { id: "3", label: "Tell me about yourself", body: "I'm a software engineer with 8 years experience…", tags: ["intro"] },
];

describe("rankSnippets", () => {
  it("ranks tag-matching snippets first", () => {
    const r = rankSnippets(snippets, { fieldTags: ["why-company"], questionText: "" });
    expect(r[0]!.snippet.id).toBe("1");
  });

  it("uses token overlap as secondary signal", () => {
    const r = rankSnippets(snippets, { fieldTags: [], questionText: "Tell us about a backend system you built" });
    expect(r[0]!.snippet.id).toBe("2");
  });

  it("falls back to lexical order when no signals", () => {
    const r = rankSnippets(snippets, { fieldTags: [], questionText: "" });
    expect(r.map(x => x.snippet.id)).toEqual(["3", "1", "2"]); // alphabetical by label: "Tell…" < "Why…company" < "Why…role"
  });

  it("filter substring scopes the candidate set", () => {
    const r = rankSnippets(snippets, { fieldTags: [], questionText: "", filter: "company" });
    expect(r).toHaveLength(1);
    expect(r[0]!.snippet.id).toBe("1");
  });
});
