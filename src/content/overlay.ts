import type { FillReport } from "../shared/types";

const STYLE_ID = "jobfill-overlay-style";
const STYLE_CSS = `
  .jobfill-overlay {
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
    background: #1f2937; color: #f3f4f6; font: 12px/1.4 system-ui, sans-serif;
    border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.3);
    width: 360px; max-height: 60vh; overflow: auto; padding: 12px 14px;
  }
  .jobfill-overlay h4 { margin: 0 0 8px 0; font-size: 13px; font-weight: 600; }
  .jobfill-overlay ul { list-style: none; margin: 0; padding: 0; }
  .jobfill-overlay li { padding: 2px 0; display: flex; gap: 6px; align-items: center; }
  .jobfill-overlay .ok { color: #34d399; }
  .jobfill-overlay .skip { color: #fbbf24; }
  .jobfill-overlay .tag { font-size: 10px; padding: 1px 4px; border-radius: 3px; background:#374151; }
  .jobfill-overlay .actions { display: flex; gap: 8px; margin-top: 10px; }
  .jobfill-overlay button { font: inherit; padding: 4px 8px; border-radius: 4px; border: 1px solid #4b5563;
    background: #374151; color: inherit; cursor: pointer; }
  .jobfill-overlay button:hover { background: #4b5563; }
  .jobfill-overlay .close { position: absolute; top: 6px; right: 8px; background: transparent; border: 0; }
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
        <li><span class="ok">✓</span>
          <span>${escapeHtml(f.signature.label || f.signature.name || f.signature.id || "(field)")}</span>
          <span class="tag">${f.confidence}</span></li>
      `).join("")}
      ${report.skipped.map(s => `
        <li><span class="skip">⊘</span>
          <span>${escapeHtml(s.signature.label || s.signature.name || s.signature.id || "(field)")}</span>
          <span class="tag">${escapeHtml(s.reason)}</span></li>
      `).join("")}
    </ul>
    <div class="actions">
      <button data-action="undo">Undo all</button>
      <button data-action="close">Close</button>
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
