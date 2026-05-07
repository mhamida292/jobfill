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
});
