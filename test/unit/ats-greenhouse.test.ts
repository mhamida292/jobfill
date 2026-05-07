import { describe, it, expect } from "vitest";
import { greenhousePack } from "../../src/content/matchers/ats-packs/greenhouse";

describe("greenhousePack", () => {
  it("matches greenhouse domain variants", () => {
    expect(greenhousePack.matches("boards.greenhouse.io")).toBe(true);
    expect(greenhousePack.matches("acme.greenhouse.io")).toBe(true);
    expect(greenhousePack.matches("example.com")).toBe(false);
  });

  it("matches first_name field by id", () => {
    const r = greenhousePack.match({ label: "First Name", name: "job_application[first_name]", id: "first_name", placeholder: "", type: "text" });
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.first_name" });
  });

  it("matches phone by name pattern", () => {
    const r = greenhousePack.match({ label: "Phone", name: "job_application[phone]", id: "", placeholder: "", type: "tel" });
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.phone" });
  });

  it("returns null on unknown fields", () => {
    expect(greenhousePack.match({ label: "Favorite Pokemon", name: "", id: "", placeholder: "", type: "text" })).toBeNull();
  });
});
