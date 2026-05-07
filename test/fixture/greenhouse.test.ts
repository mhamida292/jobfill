import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanFields } from "../../src/content/scanner";
import { runCascade } from "../../src/content/matchers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "../fixtures/greenhouse-application.html"), "utf8");

describe("Greenhouse fixture", () => {
  it("matches first_name, last_name, email, phone via ATS pack", () => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fields = scanFields(doc.body);
    const results = fields.map(f => ({ sig: f.signature, m: runCascade(f.signature, [], "boards.greenhouse.io") }));
    const byPath = (path: string) => results.filter(r =>
      r.m?.fills_with.kind === "profile_path" && (r.m.fills_with as { path: string }).path === path);
    expect(byPath("personal.first_name").length).toBeGreaterThan(0);
    expect(byPath("personal.last_name").length).toBeGreaterThan(0);
    expect(byPath("personal.email").length).toBeGreaterThan(0);
    expect(byPath("personal.phone").length).toBeGreaterThan(0);
    // confirm the matches came from the ATS pack
    expect(byPath("personal.first_name")[0]!.m!.source).toBe("ats_pack");
  });

  it("classifies textarea questions as snippet picks", () => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fields = scanFields(doc.body);
    const snippetMatches = fields
      .map(f => runCascade(f.signature, [], "boards.greenhouse.io"))
      .filter(m => m?.fills_with.kind === "snippet_id");
    expect(snippetMatches.length).toBeGreaterThan(0);
  });
});
