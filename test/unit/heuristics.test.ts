import { describe, it, expect } from "vitest";
import { matchHeuristic } from "../../src/content/matchers/heuristics";
import type { FieldSignature } from "../../src/shared/types";

const sig = (over: Partial<FieldSignature> = {}): FieldSignature => ({
  label: "", name: "", id: "", placeholder: "", type: "text", ...over,
});

describe("matchHeuristic", () => {
  it("matches email by name attribute", () => {
    const r = matchHeuristic(sig({ name: "applicant_email", type: "email" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.email" });
  });

  it("matches phone by label", () => {
    const r = matchHeuristic(sig({ label: "Phone Number", type: "tel" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.phone" });
  });

  it("matches first_name by id", () => {
    const r = matchHeuristic(sig({ id: "first-name" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.first_name" });
  });

  it("classifies a 'Why this company' textarea as snippet (no fill)", () => {
    const r = matchHeuristic(sig({ label: "Why are you interested in our company?", type: "textarea" }));
    expect(r?.fills_with).toEqual({ kind: "snippet_id", id: "" }); // empty id = picker
    expect(r?.tags).toContain("why-company");
  });

  it("returns null when nothing matches", () => {
    const r = matchHeuristic(sig({ label: "Favorite color" }));
    expect(r).toBeNull();
  });

  it("matches phone in underscore-separated name like `applicant_phone`", () => {
    const r = matchHeuristic(sig({ name: "applicant_phone", type: "tel" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.phone" });
  });

  it("matches city in underscore-separated name like `home_city`", () => {
    const r = matchHeuristic(sig({ name: "home_city" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.city" });
  });

  it("routes 'Describe your role' textareas to work_history.0.description", () => {
    const r = matchHeuristic(sig({ label: "Describe your role and responsibilities", type: "textarea" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "work_history.0.description" });
  });

  it("routes 'Job description' to work_history.0.description", () => {
    const r = matchHeuristic(sig({ label: "Job Description", type: "textarea" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "work_history.0.description" });
  });

  it("uses group_label for race/ethnicity checkbox groups when label is just the option", () => {
    const r = matchHeuristic(sig({ label: "Asian", group_label: "Race / Ethnicity", type: "checkbox" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.race" });
  });

  it("matches Workday's data-automation-id for gender", () => {
    const r = matchHeuristic(sig({ data_automation_id: "formField-gender", type: "select" }));
    expect(r?.fills_with).toEqual({ kind: "profile_path", path: "personal.gender" });
  });
});
