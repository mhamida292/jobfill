import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanFields } from "../../src/content/scanner";
import { runCascade } from "../../src/content/matchers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "../fixtures/lever-application.html"), "utf8");

describe("Lever fixture", () => {
  it("matches name, email, phone, urls[LinkedIn]", () => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fields = scanFields(doc.body);
    const matches = fields.map(f => ({ sig: f.signature, m: runCascade(f.signature, [], "jobs.lever.co") }));
    const has = (path: string) => matches.some(x =>
      x.m?.fills_with.kind === "profile_path" && (x.m.fills_with as { path: string }).path === path);
    expect(has("personal.full_name")).toBe(true);
    expect(has("personal.email")).toBe(true);
    expect(has("personal.phone")).toBe(true);
    expect(has("personal.linkedin_url")).toBe(true);
  });
});
