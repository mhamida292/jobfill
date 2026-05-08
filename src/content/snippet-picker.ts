import type { Snippet } from "../shared/types";

export interface RankingContext {
  fieldTags: string[];
  questionText: string;
  filter?: string;
  recentlyUsedIds?: string[];
}

export interface RankedSnippet {
  snippet: Snippet;
  score: number;
}

const STOP = new Set([
  "a","an","the","of","and","or","to","in","is","are","i","you","we",
  "with","for","on","at","by","be","this","that","my","our","your",
  "about","tell","us","why","what","how",
]);

export function rankSnippets(snippets: Snippet[], ctx: RankingContext): RankedSnippet[] {
  let candidates = snippets;
  if (ctx.filter) {
    const f = ctx.filter.toLowerCase();
    candidates = snippets.filter(s =>
      s.label.toLowerCase().includes(f) ||
      s.body.toLowerCase().includes(f) ||
      s.tags.some(t => t.toLowerCase().includes(f)));
  }

  const qTokens = tokenize(ctx.questionText);
  const recent = new Set(ctx.recentlyUsedIds ?? []);

  const ranked = candidates.map(s => {
    const tagOverlap = ctx.fieldTags.filter(t => s.tags.includes(t)).length;
    const tokenOverlap = countOverlap(qTokens, tokenize(s.body));
    const recencyBonus = recent.has(s.id) ? 0.5 : 0;
    const score = tagOverlap * 100 + tokenOverlap + recencyBonus;
    return { snippet: s, score };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.snippet.label.localeCompare(b.snippet.label);
  });

  return ranked;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z]{3,}/g)?.filter(t => !STOP.has(t)) ?? [];
}

function countOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter(t => setB.has(t)).length;
}

import { loadAll } from "../shared/storage";
import { interpolate, extractPageVars } from "../shared/interpolate";

const STYLE_CSS = `
  .jobfill-picker {
    position: absolute; z-index: 2147483647;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0; padding: 10px; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.6);
    border: 1px solid rgba(99,102,241,.2);
    font: 13px/1.5 system-ui, -apple-system, sans-serif;
    width: 380px; max-height: 60vh; overflow: auto;
  }
  .jobfill-picker input {
    width: 100%; background: #0f172a; color: inherit;
    border: 1px solid #334155; border-radius: 8px;
    padding: 7px 10px; font: inherit; box-sizing: border-box;
  }
  .jobfill-picker input:focus {
    outline: 0; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.18);
  }
  .jobfill-picker ul { list-style: none; margin: 6px 0 0; padding: 0; }
  .jobfill-picker li {
    padding: 7px 10px; cursor: pointer; border-radius: 7px;
    color: #cbd5e1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .jobfill-picker li.sel, .jobfill-picker li:hover {
    background: rgba(99,102,241,.15); color: #e2e8f0;
    box-shadow: inset 0 0 0 1px rgba(99,102,241,.25);
  }
  .jobfill-picker .tag {
    font-size: 10px; padding: 2px 7px; border-radius: 10px;
    background: #312e81; color: #a5b4fc; font-weight: 500;
  }
  .jobfill-picker .hint {
    font-size: 11px; color: #64748b; padding: 6px 10px 0;
  }
`;

let pickerRoot: HTMLElement | null = null;

export async function openSnippetPicker(target: HTMLElement, fieldTags: string[] = []): Promise<void> {
  ensureStyle();
  closePicker();
  const data = await loadAll();
  const pageVars = extractPageVars(document, new URL(location.href));
  const questionText = inferQuestionText(target);

  const root = el("div", { class: "jobfill-picker" });
  const rect = target.getBoundingClientRect();
  root.style.left = `${rect.left + window.scrollX}px`;
  root.style.top  = `${rect.bottom + window.scrollY + 4}px`;

  const filterInput = el("input", { type: "text", placeholder: "Filter snippets…" }) as HTMLInputElement;
  const list = el("ul");
  const hint = el("div", { class: "hint" }, "↑↓ navigate · Enter insert · Esc cancel");
  root.appendChild(filterInput);
  root.appendChild(list);
  root.appendChild(hint);

  let filter = "";
  let sel = 0;

  function render(): void {
    const ranked = rankSnippets(data.snippets, { fieldTags, questionText, filter });
    while (list.firstChild) list.removeChild(list.firstChild);
    ranked.forEach((r, i) => {
      const li = el("li", { "data-id": r.snippet.id, class: i === sel ? "sel" : "" },
        r.snippet.label,
      );
      for (const t of r.snippet.tags) li.appendChild(el("span", { class: "tag" }, t));
      li.addEventListener("click", () => insert(r.snippet));
      list.appendChild(li);
    });
  }

  function insert(s: Snippet): void {
    const out = interpolate(s.body, { company: pageVars.company, role: pageVars.role });
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      target.value = out.text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (target.isContentEditable) {
      target.textContent = out.text;
    }
    if (out.unresolved.length > 0) {
      console.warn("[jobfill] unresolved snippet vars:", out.unresolved);
    }
    closePicker();
  }

  filterInput.addEventListener("input", () => { filter = filterInput.value; sel = 0; render(); });
  filterInput.addEventListener("keydown", (ev) => {
    const ranked = rankSnippets(data.snippets, { fieldTags, questionText, filter });
    if (ev.key === "ArrowDown") { sel = Math.min(sel + 1, ranked.length - 1); render(); ev.preventDefault(); }
    if (ev.key === "ArrowUp")   { sel = Math.max(sel - 1, 0); render(); ev.preventDefault(); }
    if (ev.key === "Enter")     { if (ranked[sel]) insert(ranked[sel]!.snippet); ev.preventDefault(); }
    if (ev.key === "Escape")    { closePicker(); }
  });

  document.documentElement.appendChild(root);
  pickerRoot = root;
  filterInput.focus();
  render();
}

export function closePicker(): void {
  pickerRoot?.remove();
  pickerRoot = null;
}

function inferQuestionText(target: HTMLElement): string {
  const aria = target.getAttribute("aria-label");
  if (aria) return aria;
  if (target.id) {
    const lab = document.querySelector(`label[for="${cssEscape(target.id)}"]`);
    if (lab?.textContent) return lab.textContent.trim();
  }
  const wrap = target.closest("label");
  if (wrap?.textContent) return wrap.textContent.trim();
  return target.getAttribute("placeholder") ?? "";
}

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function ensureStyle(): void {
  if (document.getElementById("jobfill-picker-style")) return;
  const s = document.createElement("style");
  s.id = "jobfill-picker-style";
  s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}

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
