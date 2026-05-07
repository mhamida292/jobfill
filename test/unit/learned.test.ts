import { describe, it, expect } from "vitest";
import { matchLearned } from "../../src/content/matchers/learned";
import type { Mapping, FieldSignature } from "../../src/shared/types";

const mappings: Mapping[] = [
  { field_signature: { label: "Phone", name: "phone", id: "applicant_phone", placeholder: "", type: "tel" },
    fills_with: { kind: "profile_path", path: "personal.phone" }, scope: "domain" },
  { field_signature: { label: "Are you 18+?", name: "age_check", id: "", placeholder: "", type: "select" },
    fills_with: { kind: "literal", value: "Yes" }, scope: "domain" },
];

const sig = (over: Partial<FieldSignature> = {}): FieldSignature => ({
  label: "", name: "", id: "", placeholder: "", type: "text", ...over,
});

describe("matchLearned", () => {
  it("matches by id first", () => {
    const r = matchLearned(sig({ id: "applicant_phone", name: "different", label: "different" }), mappings);
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.phone" });
  });

  it("falls back to name when id differs", () => {
    const r = matchLearned(sig({ id: "new_id", name: "phone" }), mappings);
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.phone" });
  });

  it("falls back to label as last resort", () => {
    const r = matchLearned(sig({ label: "Are you 18+?", type: "select" }), mappings);
    expect(r?.fills_with).toEqual({ kind: "literal", value: "Yes" });
  });

  it("returns null when nothing matches", () => {
    expect(matchLearned(sig({ id: "x", name: "y", label: "z" }), mappings)).toBeNull();
  });

  it("ignores empty signature components for matching", () => {
    // empty id should never match an empty stored id
    const r = matchLearned(sig({ id: "", name: "", label: "" }), mappings);
    expect(r).toBeNull();
  });
});
