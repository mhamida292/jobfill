import { describe, it, expect } from "vitest";
import { scanFields } from "../../src/content/scanner";

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");
}

describe("scanFields", () => {
  it("captures id, name, type, placeholder", () => {
    const doc = makeDoc(`
      <input id="email" name="email_address" type="email" placeholder="you@example.com">
    `);
    const fields = scanFields(doc.body);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.signature).toMatchObject({
      id: "email", name: "email_address", type: "email", placeholder: "you@example.com",
    });
  });

  it("resolves <label for=...> as field label", () => {
    const doc = makeDoc(`
      <label for="phone">Phone Number</label>
      <input id="phone" name="phone" type="tel">
    `);
    const fields = scanFields(doc.body);
    expect(fields[0]!.signature.label).toBe("Phone Number");
  });

  it("falls back to aria-label", () => {
    const doc = makeDoc(`<input aria-label="Cover Letter" id="x" type="text">`);
    expect(scanFields(doc.body)[0]!.signature.label).toBe("Cover Letter");
  });

  it("falls back to nearest preceding text when no label/aria-label", () => {
    const doc = makeDoc(`
      <div>LinkedIn URL</div>
      <input id="li" type="url">
    `);
    expect(scanFields(doc.body)[0]!.signature.label).toBe("LinkedIn URL");
  });

  it("includes textareas and selects", () => {
    const doc = makeDoc(`
      <textarea id="why" placeholder="Why us?"></textarea>
      <select id="state"><option>CA</option></select>
    `);
    const fields = scanFields(doc.body);
    expect(fields.map(f => f.signature.type).sort()).toEqual(["select", "textarea"]);
  });

  it("skips hidden, disabled, readonly, and submit/button inputs", () => {
    const doc = makeDoc(`
      <input id="a" type="hidden">
      <input id="b" type="text" disabled>
      <input id="c" type="text" readonly>
      <input id="d" type="submit">
      <button id="e">x</button>
      <input id="f" type="text">
    `);
    const fields = scanFields(doc.body);
    expect(fields.map(f => f.signature.id)).toEqual(["f"]);
  });

  it("includes file inputs (so the overlay can flag them as manual)", () => {
    const doc = makeDoc(`<input id="resume" type="file">`);
    const fields = scanFields(doc.body);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.signature.type).toBe("file");
  });

  it("captures data-automation-id when present", () => {
    const doc = makeDoc(`<input id="x" type="text" data-automation-id="formField-firstName">`);
    const fields = scanFields(doc.body);
    expect(fields[0]!.signature.data_automation_id).toBe("formField-firstName");
  });

  it("aria-labelledby with multiple IDs concatenates referenced text", () => {
    const doc = makeDoc(`
      <span id="lbl-a">Phone</span>
      <span id="lbl-b">Number</span>
      <input id="p" type="tel" aria-labelledby="lbl-a lbl-b">
    `);
    expect(scanFields(doc.body)[0]!.signature.label).toBe("Phone Number");
  });

  it("strips the input out of a wrapping label without using string replace", () => {
    // The wrapping label says "Name Jane" — naive string replace of "Jane" would
    // leave "Name". The DOM walk should ignore the input element entirely.
    const doc = makeDoc(`
      <label>Name <input id="n" type="text" value="Jane"></label>
    `);
    expect(scanFields(doc.body)[0]!.signature.label).toBe("Name");
  });

  it("walks ancestor chain to find a question label nested 2-3 levels deep (Workday-like)", () => {
    const doc = makeDoc(`
      <div class="row">
        <div class="question">What is your gender?</div>
        <div class="answer">
          <div class="control">
            <input id="g" type="text">
          </div>
        </div>
      </div>
    `);
    expect(scanFields(doc.body)[0]!.signature.label).toBe("What is your gender?");
  });

  it("captures a fieldset legend as group_label for grouped checkboxes", () => {
    const doc = makeDoc(`
      <fieldset>
        <legend>Race / Ethnicity</legend>
        <label><input type="checkbox" name="race" value="asian"> Asian</label>
        <label><input type="checkbox" name="race" value="black"> Black</label>
      </fieldset>
    `);
    const fields = scanFields(doc.body);
    expect(fields).toHaveLength(2);
    expect(fields[0]!.signature.group_label).toBe("Race / Ethnicity");
    expect(fields[1]!.signature.group_label).toBe("Race / Ethnicity");
  });

  it("captures aria-labelledby group label for role=group containers", () => {
    const doc = makeDoc(`
      <h4 id="qh">Veteran Status</h4>
      <div role="group" aria-labelledby="qh">
        <label><input type="checkbox" name="vet" value="yes"> Yes</label>
        <label><input type="checkbox" name="vet" value="no"> No</label>
      </div>
    `);
    const fields = scanFields(doc.body);
    expect(fields[0]!.signature.group_label).toBe("Veteran Status");
  });
});
