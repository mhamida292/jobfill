import { describe, it, expect } from "vitest";
import { ashbyPack } from "../../src/content/matchers/ats-packs/ashby";

describe("ashbyPack", () => {
  it("matches jobs.ashbyhq.com", () => {
    expect(ashbyPack.matches("jobs.ashbyhq.com")).toBe(true);
    expect(ashbyPack.matches("ashbyhq.com")).toBe(true);
  });

  it("maps standard fields", () => {
    expect(ashbyPack.match({ label: "Name", name: "_systemfield_name", id: "", placeholder: "", type: "text" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.full_name" });
    expect(ashbyPack.match({ label: "Email", name: "_systemfield_email", id: "", placeholder: "", type: "email" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.email" });
  });
});
