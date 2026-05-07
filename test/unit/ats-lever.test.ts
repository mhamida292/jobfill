import { describe, it, expect } from "vitest";
import { leverPack } from "../../src/content/matchers/ats-packs/lever";

describe("leverPack", () => {
  it("matches jobs.lever.co", () => {
    expect(leverPack.matches("jobs.lever.co")).toBe(true);
    expect(leverPack.matches("hire.lever.co")).toBe(true);
  });

  it("maps Lever's name attributes", () => {
    expect(leverPack.match({ label: "Full name", name: "name", id: "", placeholder: "", type: "text" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.full_name" });
    expect(leverPack.match({ label: "", name: "email", id: "", placeholder: "", type: "email" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.email" });
  });
});
