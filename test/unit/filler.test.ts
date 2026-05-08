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
  it("indexes into work_history arrays", () => {
    const p = { ...profile, work_history: [{ company: "Acme", title: "", start_date: "", end_date: "", current: false, location: "", description: "" }] };
    expect(getProfileValue(p, "work_history.0.company")).toBe("Acme");
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

  it("rejects file inputs with a manual-fill reason", () => {
    const body = makeDoc(`<input id="resume" type="file">`);
    const el = body.querySelector<HTMLInputElement>("#resume")!;
    const r = fillElement(el, "/tmp/x.pdf", profile);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/file/i);
  });

  it("ticks only the matching option in a checkbox group (race/ethnicity)", () => {
    const body = makeDoc(`
      <form>
        <fieldset>
          <legend>Race / Ethnicity</legend>
          <label><input type="checkbox" name="race" value="asian"> Asian</label>
          <label><input type="checkbox" name="race" value="black"> Black or African American</label>
          <label><input type="checkbox" name="race" value="white"> White</label>
        </fieldset>
      </form>
    `);
    const first = body.querySelector<HTMLInputElement>('input[value="asian"]')!;
    const r = fillElement(first, "asian", profile, "personal.race");
    expect(r.ok).toBe(true);
    expect(body.querySelector<HTMLInputElement>('input[value="asian"]')!.checked).toBe(true);
    expect(body.querySelector<HTMLInputElement>('input[value="black"]')!.checked).toBe(false);
    expect(body.querySelector<HTMLInputElement>('input[value="white"]')!.checked).toBe(false);
  });

  it("checkbox group: matches by visible label text when value is opaque", () => {
    const body = makeDoc(`
      <form>
        <fieldset>
          <legend>Gender</legend>
          <label><input type="checkbox" name="gender" value="g1"> Male</label>
          <label><input type="checkbox" name="gender" value="g2"> Female</label>
        </fieldset>
      </form>
    `);
    const first = body.querySelector<HTMLInputElement>('input[value="g1"]')!;
    const r = fillElement(first, "Female", profile, "personal.gender");
    expect(r.ok).toBe(true);
    expect(body.querySelector<HTMLInputElement>('input[value="g2"]')!.checked).toBe(true);
  });

  it("falls back to single-checkbox truthy-fill when not part of a group", () => {
    const body = makeDoc(`<form><input id="tos" name="agree" type="checkbox"></form>`);
    const el = body.querySelector<HTMLInputElement>("#tos")!;
    const r = fillElement(el, "yes", profile, "personal.requires_sponsorship");
    expect(r.ok).toBe(true);
    expect(el.checked).toBe(true);
  });
});
