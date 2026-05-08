import type { Message } from "../shared/messages";
import type { FillReport, FillKind } from "../shared/types";
import { loadAll } from "../shared/storage";
import { scanFields } from "./scanner";
import { runCascade } from "./matchers";
import { fillElement, getProfileValue } from "./filler";
import { interpolate, extractPageVars } from "../shared/interpolate";
import { showOverlay } from "./overlay";
import { attachTeachMode } from "./teach-mode";
import { openSnippetPicker } from "./snippet-picker";

// In iframes, only activate when the user has opted this hostname in.
// Top frames always activate (matches the v0.1.0 behavior).
const inIframe = (() => { try { return window.top !== window.self; } catch { return true; } })();

async function isIframeOptedIn(): Promise<boolean> {
  const data = await loadAll();
  const host = location.hostname;
  return data.settings.iframe_domains.some(d => host === d || host.endsWith(`.${d}`));
}

browser.runtime.onMessage.addListener(async (msg: Message) => {
  if (inIframe && !(await isIframeOptedIn())) return;
  if (msg.type === "trigger_fill") {
    const report = await fillCurrentForm();
    showOverlay(report);
  } else if (msg.type === "trigger_snippet_picker") {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && (focused instanceof HTMLTextAreaElement || focused instanceof HTMLInputElement || focused.isContentEditable)) {
      await openSnippetPicker(focused);
    }
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
    // File inputs cannot be auto-filled by extensions (browser security).
    // Surface them so the user can find the upload spot quickly.
    if (f.element instanceof HTMLInputElement && f.element.type === "file") {
      highlightManualField(f.element);
      skipped.push({ signature: f.signature, reason: "file upload (manual)" });
      continue;
    }
    const match = runCascade(f.signature, learned, host);
    if (!match) { skipped.push({ signature: f.signature, reason: "no match" }); continue; }

    const value = await resolveFillValue(match.fills_with, data.profile, pageVars, data.snippets);
    if (value === null) {
      if (match.fills_with.kind === "snippet_id" && !match.fills_with.id) {
        await openSnippetPicker(f.element, match.tags);
        skipped.push({ signature: f.signature, reason: "snippet picker opened" });
        continue;
      }
      skipped.push({ signature: f.signature, reason: "no value resolved" });
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

// Briefly outline a field that the user has to fill in by hand (e.g., file uploads),
// so the post-fill overlay's "skipped" entries are easy to locate on the page.
const HIGHLIGHT_STYLE_ID = "jobfill-highlight-style";
const HIGHLIGHT_CLASS = "jobfill-needs-attention";
function highlightManualField(el: HTMLElement): void {
  ensureHighlightStyle();
  el.classList.add(HIGHLIGHT_CLASS);
  setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), 6000);
}
function ensureHighlightStyle(): void {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = HIGHLIGHT_STYLE_ID;
  s.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px dashed #f59e0b !important;
      outline-offset: 2px !important;
      animation: jobfill-pulse 1.4s ease-in-out infinite;
    }
    @keyframes jobfill-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.45); }
      50%      { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
    }
  `;
  document.head.appendChild(s);
}

// Teach mode listens for Ctrl-click and only matters where the user can interact.
// Skip it inside iframes that haven't opted in, to avoid intercepting clicks on
// embedded ads/analytics/widgets.
(async () => {
  if (!inIframe || (await isIframeOptedIn())) attachTeachMode();
  console.log("[jobfill] content ready", inIframe ? "(iframe)" : "");
})();
