import { describe, it, expect } from "vitest";
import { fillElement, getProfileValue } from "../../src/content/filler";
import type { Profile } from "../../src/shared/types";

const profile: Profile = {
  personal: {
    first_name: "Mo", last_name: "Q", email: "m@x.com",
    phone: "+1 555 0100", address_line1: "1 Way", city: "NYC", state: "NY",
    postal_code: "10001", country: "US",
    linkedin_url: "https://linkedin.com/in/mo", github_url: "", portfolio_url: "",
    work_authorization: "us_citizen", requires_sponsorship: false,
    gender: "", race: "", veteran_status: "", disability_status: "",
  },
  work_history: [], education: [],
};

function makeDoc(html: string): HTMLElement {
  const d = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
  return d.body;
}

describe("getProfileValue", () => {
  it("resolves dotted paths", () => {
    expect(getProfileValue(profile, "personal.email")).toBe("m@x.com");
    expect(getProfileValue(profile, "personal.requires_sponsorship")).toBe("false");
  });
  it("returns empty for missing paths", () => {
    expect(getProfileValue(profile, "personal.nope")).toBe("");
  });
});

describe("fillElement", () => {
  it("fills a text input and emits input/change events", () => {
    const body = makeDoc(`<input id="email" type="email">`);
    const el = body.querySelector<HTMLInputElement>("#email")!;
    let changeFired = false;
    el.addEventListener("change", () => { changeFired = true; });
    const r = fillElement(el, "x@y.com", profile);
    expect(r.ok).toBe(true);
    expect(el.value).toBe("x@y.com");
    expect(changeFired).toBe(true);
  });

  it("fills a select via synonym resolution", () => {
    const body = makeDoc(`
      <select id="auth">
        <option value="1">U.S. Citizen</option>
        <option value="2">Permanent Resident</option>
      </select>`);
    const el = body.querySelector<HTMLSelectElement>("#auth")!;
    const r = fillElement(el, "us_citizen", profile, "personal.work_authorization");
    expect(r.ok).toBe(true);
    expect(el.value).toBe("1");
  });

  it("returns ok=false when select has no matching option", () => {
    const body = makeDoc(`<select id="x"><option>Banana</option></select>`);
    const el = body.querySelector<HTMLSelectElement>("#x")!;
    const r = fillElement(el, "us_citizen", profile, "personal.work_authorization");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/option/i);
  });

  it("checks a checkbox when value is truthy", () => {
    const body = makeDoc(`<input id="c" type="checkbox">`);
    const el = body.querySelector<HTMLInputElement>("#c")!;
    fillElement(el, "true", profile);
    expect(el.checked).toBe(true);
  });
});
