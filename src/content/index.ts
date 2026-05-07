import type { Message } from "../shared/messages";
import type { FillReport, FillKind } from "../shared/types";
import { loadAll } from "../shared/storage";
import { scanFields } from "./scanner";
import { runCascade } from "./matchers";
import { fillElement, getProfileValue } from "./filler";
import { interpolate, extractPageVars } from "../shared/interpolate";
import { showOverlay } from "./overlay";
import { attachTeachMode } from "./teach-mode";

browser.runtime.onMessage.addListener(async (msg: Message) => {
  if (msg.type === "trigger_fill") {
    const report = await fillCurrentForm();
    showOverlay(report);
  }
});

async function fillCurrentForm(): Promise<FillReport> {
  const data = await loadAll();
  const host = location.hostname;
  const learned = data.mappings[host] ?? data.mappings[stripSubdomain(host)] ?? [];
  const fields = scanFields(document.body);

  const filled: FillReport["filled"] = [];
  const skipped: FillReport["skipped"] = [];
  const snapshot = new Map<HTMLElement, string>();
  const pageVars = extractPageVars(document, new URL(location.href));

  for (const f of fields) {
    const match = runCascade(f.signature, learned, host);
    if (!match) { skipped.push({ signature: f.signature, reason: "no match" }); continue; }

    const value = await resolveFillValue(match.fills_with, data.profile, pageVars, data.snippets);
    if (value === null) {
      skipped.push({ signature: f.signature, reason: "snippet picker required (UI not yet implemented)" });
      continue;
    }

    snapshot.set(f.element, currentValue(f.element));
    const path = match.fills_with.kind === "profile_path" ? match.fills_with.path : undefined;
    const r = fillElement(f.element, value, data.profile, path);
    if (r.ok) {
      filled.push({ signature: f.signature, value, confidence: match.confidence, source: match.source });
    } else {
      skipped.push({ signature: f.signature, reason: r.reason ?? "fill failed" });
    }
  }

  return { filled, skipped, snapshot };
}

async function resolveFillValue(
  fk: FillKind,
  profile: import("../shared/types").Profile,
  pageVars: ReturnType<typeof extractPageVars>,
  snippets: import("../shared/types").Snippet[],
): Promise<string | null> {
  if (fk.kind === "profile_path") {
    if (fk.path === "personal.full_name") {
      return `${profile.personal.first_name} ${profile.personal.last_name}`.trim();
    }
    return getProfileValue(profile, fk.path);
  }
  if (fk.kind === "literal") return fk.value;
  if (fk.kind === "snippet_id") {
    if (!fk.id) return null; // requires picker
    const s = snippets.find(x => x.id === fk.id);
    if (!s) return null;
    const out = interpolate(s.body, { company: pageVars.company, role: pageVars.role });
    return out.text;
  }
  if (fk.kind === "skip") return null;
  return null;
}

function currentValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return el.textContent ?? "";
}

function stripSubdomain(host: string): string {
  const parts = host.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : host;
}

attachTeachMode();
console.log("[jobfill] content ready");
