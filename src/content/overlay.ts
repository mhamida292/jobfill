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
  .jobfill-overlay .close {
    position: absolute; top: 8px; right: 10px; background: transparent;
    border: 0; color: #64748b; padding: 0; box-shadow: none;
    font-size: 16px; cursor: pointer;
  }
  .jobfill-overlay .close:hover { color: #cbd5e1; }
`;

let currentRoot: HTMLElement | null = null;
let undoSnapshot: FillReport["snapshot"] | null = null;

export function showOverlay(report: FillReport): void {
  ensureStyle();
  hideOverlay();
  undoSnapshot = report.snapshot;

  const el = document.createElement("div");
  el.className = "jobfill-overlay";
  el.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <h4>Filled ${report.filled.length}, skipped ${report.skipped.length}</h4>
    <ul>
      ${report.filled.map(f => `
        <li><span class="ok">●</span>
          <span class="field">${escapeHtml(f.signature.label || f.signature.name || f.signature.id || "(field)")}</span>
          <span class="tag tag-${f.confidence === "high" ? "high" : f.confidence === "medium" ? "medium" : "low"}">${f.confidence === "high" ? "hi" : f.confidence === "medium" ? "med" : "low"}</span></li>
      `).join("")}
      ${report.skipped.map(s => `
        <li><span class="skip">○</span>
          <span class="field skipped-field">${escapeHtml(s.signature.label || s.signature.name || s.signature.id || "(field)")}</span>
          <span class="tag tag-skip">${escapeHtml(s.reason)}</span></li>
      `).join("")}
    </ul>
    <div class="actions">
      <button data-action="undo">Undo all</button>
      <button data-action="close" class="ghost">Close</button>
    </div>
  `;
  el.querySelector(".close")?.addEventListener("click", hideOverlay);
  el.querySelector('[data-action="close"]')?.addEventListener("click", hideOverlay);
  el.querySelector('[data-action="undo"]')?.addEventListener("click", undoAll);

  document.documentElement.appendChild(el);
  currentRoot = el;

  setTimeout(() => { if (currentRoot === el) hideOverlay(); }, 8000);
}

export function hideOverlay(): void {
  currentRoot?.remove();
  currentRoot = null;
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
}
