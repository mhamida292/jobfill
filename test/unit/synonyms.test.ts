import { describe, it, expect } from "vitest";
import { resolveOption } from "../../src/shared/synonyms";

describe("resolveOption", () => {
  it("matches profile value to exact option value", () => {
    const opts = [
      { value: "us_citizen", text: "U.S. Citizen" },
      { value: "perm_res",   text: "Permanent Resident" },
    ];
    const r = resolveOption("personal.work_authorization", "us_citizen", opts);
    expect(r?.value).toBe("us_citizen");
    expect(r?.confidence).toBe("medium");
  });

  it("matches via synonym table when values differ", () => {
    const opts = [
      { value: "1", text: "U.S. Citizen" },
      { value: "2", text: "Permanent Resident" },
    ];
    const r = resolveOption("personal.work_authorization", "us_citizen", opts);
    expect(r?.value).toBe("1");
    expect(r?.confidence).toBe("medium");
  });

  it("falls back to fuzzy contains with low confidence", () => {
    const opts = [
      { value: "a", text: "Citizen of the United States" },
      { value: "b", text: "Other" },
    ];
    const r = resolveOption("personal.work_authorization", "us_citizen", opts);
    expect(r?.value).toBe("a");
    expect(r?.confidence).toBe("low");
  });

  it("returns null when nothing matches", () => {
    const opts = [{ value: "x", text: "Banana" }];
    const r = resolveOption("personal.work_authorization", "us_citizen", opts);
    expect(r).toBeNull();
  });

  it("matches via token-level fuzzy when synonym words are reordered or interleaved", () => {
    // Synonym "Permanent Resident" tokens are interleaved by "Status" — no synonym
    // is a contiguous substring of the option text, so this can only match via
    // the token-level fuzzy step.
    const opts = [
      { value: "1", text: "U.S. Citizen" },
      { value: "2", text: "Permanent Status: Resident" },
    ];
    const r = resolveOption("personal.work_authorization", "permanent_resident", opts);
    expect(r?.value).toBe("2");
    expect(r?.confidence).toBe("low");
  });

  it("requires_sponsorship=true does NOT pick the negated 'I will not require sponsorship' option", () => {
    // Token-fuzzy could share ["will","require","sponsorship"] across the two,
    // but the negation guard rejects the "not" mismatch.
    const opts = [
      { value: "yes", text: "Yes, I will require sponsorship" },
      { value: "no",  text: "No, I will not require sponsorship" },
    ];
    const r = resolveOption("personal.requires_sponsorship", "true", opts);
    expect(r?.value).toBe("yes");
  });

  it("requires_sponsorship=false picks the negated option correctly", () => {
    const opts = [
      { value: "yes", text: "Yes, I will require sponsorship" },
      { value: "no",  text: "No, I will not require sponsorship" },
    ];
    const r = resolveOption("personal.requires_sponsorship", "false", opts);
    expect(r?.value).toBe("no");
  });

  it("race: matches 'Black or African American' from profile value 'black'", () => {
    const opts = [
      { value: "1", text: "Asian" },
      { value: "2", text: "Black or African American" },
      { value: "3", text: "White" },
    ];
    const r = resolveOption("personal.race", "black", opts);
    expect(r?.value).toBe("2");
  });

  it("race: matches 'White / Caucasian' via synonym for 'white'", () => {
    const opts = [
      { value: "1", text: "Asian" },
      { value: "2", text: "White / Caucasian" },
    ];
    const r = resolveOption("personal.race", "white", opts);
    expect(r?.value).toBe("2");
  });
});
