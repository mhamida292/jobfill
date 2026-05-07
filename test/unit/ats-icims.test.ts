import { describe, it, expect } from "vitest";
import { icimsPack } from "../../src/content/matchers/ats-packs/icims";

describe("icimsPack", () => {
  it("matches careers-*.icims.com", () => {
    expect(icimsPack.matches("careers-acme.icims.com")).toBe(true);
    expect(icimsPack.matches("acme.icims.com")).toBe(true);
  });

  it("maps standard iCIMS field name patterns", () => {
    expect(icimsPack.match({ label: "First Name", name: "icims_field_first", id: "", placeholder: "", type: "text" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.first_name" });
    expect(icimsPack.match({ label: "Email", name: "icims_field_email", id: "", placeholder: "", type: "email" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.email" });
  });
});
