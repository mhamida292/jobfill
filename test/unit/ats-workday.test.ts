import { describe, it, expect } from "vitest";
import { workdayPack } from "../../src/content/matchers/ats-packs/workday";

describe("workdayPack", () => {
  it("matches *.myworkdayjobs.com and *.myworkday.com", () => {
    expect(workdayPack.matches("acme.wd1.myworkdayjobs.com")).toBe(true);
    expect(workdayPack.matches("acme.myworkday.com")).toBe(true);
  });

  it("uses data-automation-id values from name when present", () => {
    expect(workdayPack.match({ label: "Legal Name", name: "name--legalName--firstName", id: "", placeholder: "", type: "text" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.first_name" });
    expect(workdayPack.match({ label: "Legal Name", name: "name--legalName--lastName", id: "", placeholder: "", type: "text" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.last_name" });
    expect(workdayPack.match({ label: "Email Address", name: "email", id: "", placeholder: "", type: "email" })?.fills_with)
      .toEqual({ kind: "profile_path", path: "personal.email" });
  });

  it("matches Workday's data-automation-id attribute (most stable signal)", () => {
    expect(workdayPack.match({
      label: "", name: "", id: "", placeholder: "", type: "text",
      data_automation_id: "formField-firstName",
    })?.fills_with).toEqual({ kind: "profile_path", path: "personal.first_name" });

    expect(workdayPack.match({
      label: "", name: "", id: "", placeholder: "", type: "text",
      data_automation_id: "formField-gender",
    })?.fills_with).toEqual({ kind: "profile_path", path: "personal.gender" });

    expect(workdayPack.match({
      label: "", name: "", id: "", placeholder: "", type: "text",
      data_automation_id: "formField-veteran-status",
    })?.fills_with).toEqual({ kind: "profile_path", path: "personal.veteran_status" });
  });
});
