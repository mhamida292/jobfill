import type { FillReport } from "../shared/types";

const STYLE_ID = "jobfill-overlay-style";
const STYLE_CSS = `
  .jobfill-overlay {
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0; font: 13px/1.5 system-ui, -apple-system, sans-serif;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(99,102,241,.08);
    border: 1px solid rgba(99,102,241,.18);
    width: 360px; max-height: 60vh; overflow: auto; padding: 14px 16px;
  }
  .jobfill-overlay h4 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .jobfill-overlay ul { list-style: none; margin: 0; padding: 0; }
  .jobfill-overlay li { padding: 3px 0; display: flex; gap: 8px; align-items: center; font-size: 12px; }
  .jobfill-overlay .ok { color: #34d399; }
  .jobfill-overlay .skip { color: #fbbf24; }
  .jobfill-overlay .field { flex: 1; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .jobfill-overlay .skipped-field { color: #94a3b8; }
  .jobfill-overlay .tag {
    font-size: 10px; padding: 2px 7px; border-radius: 10px;
    background: #312e81; color: #a5b4fc; font-weight: 500; flex-shrink: 0;
  }
  .jobfill-overlay .tag-medium { background: #1e3a8a; color: #93c5fd; }
  .jobfill-overlay .tag-low { background: #1e293b; color: #94a3b8; }
  .jobfill-overlay .tag-skip { background: #1e293b; color: #94a3b8; font-weight: 400; }
  .jobfill-overlay .actions { display: flex; gap: 6px; margin-top: 12px; }
  .jobfill-overlay button {
    font: inherit; padding: 6px 12px; border-radius: 8px; border: 0;
    background: #6366f1; color: #fff; cursor: pointer; font-weight: 500;
    box-shadow: 0 4px 12px rgba(99,102,241,.3);
  }
  .jobfill-overlay button:hover { background: #4f46e5; }
  .jobfill-overlay button.ghost {
    background: transparent; border: 1px solid #334155; color: #cbd5e1; box-shadow: none;
  }
  .jobfill-overlay button.ghost:hover { background: rgba(99,102,241,.08); }
  .jobfill-overlay .icon-btn {
    position: absolute; top: 8px; background: transparent;
    border: 0; color: #64748b; padding: 0; box-shadow: none;
    font-size: 14px; cursor: pointer; line-height: 1;
    width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  }
  .jobfill-overlay .icon-btn:hover { color: #cbd5e1; background: transparent; }
  .jobfill-overlay .close { right: 8px; }
  .jobfill-overlay .minimize { right: 32px; }

  .jobfill-badge {
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0; font: 12px/1 system-ui, -apple-system, sans-serif;
    border-radius: 999px; padding: 8px 14px; cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,.4), 0 0 0 1px rgba(99,102,241,.2);
    border: 0; display: flex; align-items: center; gap: 6px; font-weight: 500;
  }
  .jobfill-badge:hover { background: linear-gradient(180deg, #233148, #131e34); }
  .jobfill-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; }
`;

let currentRoot: HTMLElement | null = null;
let currentBadge: HTMLElement | null = null;
let undoSnapshot: FillReport["snapshot"] | null = null;
let lastReport: FillReport | null = null;
let autoCloseTimer: number | null = null;

export function showOverlay(report: FillReport): void {
  ensureStyle();
  hideOverlay();
  removeBadge();
  undoSnapshot = report.snapshot;
  lastReport = report;

  const root = buildOverlay(report);
  document.documentElement.appendChild(root);
  currentRoot = root;

  scheduleAutoClose();
}

function buildOverlay(report: FillReport): HTMLElement {
  const root = el("div", { class: "jobfill-overlay" });

  const closeBtn = el("button", { class: "icon-btn close", "aria-label": "Close" }, "×");
  closeBtn.addEventListener("click", hideOverlay);

  const minBtn = el("button", { class: "icon-btn minimize", "aria-label": "Minimize" }, "–");
  minBtn.addEventListener("click", minimizeOverlay);

  root.appendChild(closeBtn);
  root.appendChild(minBtn);
  root.appendChild(el("h4", {}, `Filled ${report.filled.length}, skipped ${report.skipped.length}`));

  const ul = el("ul");
  for (const f of report.filled) {
    const tier = f.confidence === "high" ? "high" : f.confidence === "medium" ? "medium" : "low";
    const label = f.confidence === "high" ? "hi" : f.confidence === "medium" ? "med" : "low";
    ul.appendChild(el("li", {},
      el("span", { class: "ok" }, "●"),
      el("span", { class: "field" }, fieldDisplayName(f.signature)),
      el("span", { class: `tag tag-${tier}` }, label),
    ));
  }
  for (const s of report.skipped) {
    ul.appendChild(el("li", {},
      el("span", { class: "skip" }, "○"),
      el("span", { class: "field skipped-field" }, fieldDisplayName(s.signature)),
      el("span", { class: "tag tag-skip" }, s.reason),
    ));
  }
  root.appendChild(ul);

  const undoBtn = el("button", { "data-action": "undo" }, "Undo all");
  undoBtn.addEventListener("click", undoAll);
  const closeFooterBtn = el("button", { class: "ghost" }, "Close");
  closeFooterBtn.addEventListener("click", hideOverlay);
  root.appendChild(el("div", { class: "actions" }, undoBtn, closeFooterBtn));

  // Pause auto-close while the user is interacting with the overlay.
  root.addEventListener("mouseenter", () => { if (autoCloseTimer !== null) { clearTimeout(autoCloseTimer); autoCloseTimer = null; } });
  root.addEventListener("mouseleave", scheduleAutoClose);

  return root;
}

function scheduleAutoClose(): void {
  if (autoCloseTimer !== null) clearTimeout(autoCloseTimer);
  const root = currentRoot;
  autoCloseTimer = window.setTimeout(() => {
    if (currentRoot === root) hideOverlay();
  }, 8000);
}

export function hideOverlay(): void {
  currentRoot?.remove();
  currentRoot = null;
  if (autoCloseTimer !== null) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
}

function removeBadge(): void {
  currentBadge?.remove();
  currentBadge = null;
}

function minimizeOverlay(): void {
  if (!lastReport) { hideOverlay(); return; }
  hideOverlay();
  const badge = el("button", { class: "jobfill-badge", "aria-label": "Reopen jobfill summary" },
    el("span", { class: "dot" }),
    `${lastReport.filled.length}/${lastReport.filled.length + lastReport.skipped.length}`,
  );
  badge.addEventListener("click", () => {
    removeBadge();
    if (lastReport) showOverlay(lastReport);
  });
  document.documentElement.appendChild(badge);
  currentBadge = badge;
}

function undoAll(): void {
  if (!undoSnapshot) return;
  for (const [el, prev] of undoSnapshot.entries()) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.value = prev;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.textContent = prev;
    }
  }
  hideOverlay();
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}

function fieldDisplayName(sig: { label: string; name: string; id: string }): string {
  return sig.label || sig.name || sig.id || "(field)";
}

// Tiny DOM builder so we don't need innerHTML or escapeHtml helpers.
type ElAttrs = Record<string, string | boolean | number>;
type ElChild = Node | string | null | undefined;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs?: ElAttrs, ...children: ElChild[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (v === true) node.setAttribute(k, "");
      else node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}
