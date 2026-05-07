import { describe, it, expect } from "vitest";
import { runCascade } from "../../src/content/matchers";
import type { FieldSignature, Mapping } from "../../src/shared/types";

const sig = (over: Partial<FieldSignature> = {}): FieldSignature => ({
  label: "", name: "", id: "", placeholder: "", type: "text", ...over,
});

describe("runCascade", () => {
  it("learned beats heuristic", () => {
    const learned: Mapping[] = [{
      field_signature: { label: "Email", name: "email", id: "e", placeholder: "", type: "email" },
      fills_with: { kind: "literal", value: "override@x.com" },
      scope: "domain",
    }];
    const r = runCascade(sig({ id: "e", name: "email", label: "Email" }), learned, "example.com");
    expect(r?.source).toBe("learned");
    expect(r?.confidence).toBe("high");
    expect(r?.fills_with).toEqual({ kind: "literal", value: "override@x.com" });
  });

  it("heuristic fires when no learned match", () => {
    const r = runCascade(sig({ name: "email", type: "email" }), [], "example.com");
    expect(r?.source).toBe("heuristic");
    expect(r?.confidence).toBe("low");
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.email" });
  });

  it("returns null when nothing matches", () => {
    const r = runCascade(sig({ label: "Favorite Pokémon" }), [], "example.com");
    expect(r).toBeNull();
  });
});
