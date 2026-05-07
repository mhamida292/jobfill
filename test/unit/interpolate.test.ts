import { describe, it, expect } from "vitest";
import { interpolate, extractPageVars } from "../../src/shared/interpolate";

describe("interpolate", () => {
  it("replaces known vars and reports them", () => {
    const out = interpolate("Hi {{company}}, applying for {{role}}.",
      { company: "Acme", role: "SWE" });
    expect(out.text).toBe("Hi Acme, applying for SWE.");
    expect(out.unresolved).toEqual([]);
  });

  it("leaves unresolved vars in place and reports them", () => {
    const out = interpolate("Hi {{company}}, role: {{role}}.", { company: "Acme" });
    expect(out.text).toBe("Hi Acme, role: {{role}}.");
    expect(out.unresolved).toEqual(["role"]);
  });

  it("does not interpret unknown {{x}} as missing if vars dict has empty string", () => {
    const out = interpolate("Hi {{company}}.", { company: "" });
    expect(out.unresolved).toEqual(["company"]);
  });
});

describe("extractPageVars", () => {
  it("derives company from URL host", () => {
    const dom = new DOMParser().parseFromString(
      "<html><head><title>Software Engineer at Acme</title></head><body><h1>Senior SWE</h1></body></html>",
      "text/html"
    );
    const vars = extractPageVars(dom, new URL("https://boards.greenhouse.io/acme/jobs/123"));
    expect(vars.company.toLowerCase()).toContain("acme");
    expect(vars.role).toMatch(/(Software Engineer|Senior SWE)/i);
  });
});
