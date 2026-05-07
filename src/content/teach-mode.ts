import type { FieldSignature, Mapping, FillKind } from "../shared/types";
import { addMapping } from "../shared/storage";

const STYLE_CSS = `
  .jobfill-teach {
    position: absolute; z-index: 2147483647;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0; padding: 14px 16px; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,.6);
    border: 1px solid rgba(99,102,241,.2);
    font: 13px/1.5 system-ui, -apple-system, sans-serif; min-width: 280px;
  }
  .jobfill-teach h5 {
    margin: 0 0 10px; font-size: 11px; text-transform: uppercase;
    letter-spacing: .6px; color: #64748b; font-weight: 600;
  }
  .jobfill-teach label { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12px; color: #cbd5e1; }
  .jobfill-teach select, .jobfill-teach input[type=text] {
    background: #0f172a; color: inherit;
    border: 1px solid #334155; border-radius: 6px;
    padding: 4px 8px; font: inherit;
  }
  .jobfill-teach select:focus, .jobfill-teach input[type=text]:focus {
    outline: 0; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.18);
  }
  .jobfill-teach .actions { display: flex; gap: 6px; margin-top: 12px; }
  .jobfill-teach button {
    font: inherit; padding: 6px 12px; border-radius: 8px;
    border: 0; background: #6366f1; color: #fff; cursor: pointer; font-weight: 500;
    box-shadow: 0 4px 12px rgba(99,102,241,.3);
  }
  .jobfill-teach button:hover { background: #4f46e5; }
  .jobfill-teach button.ghost {
    background: transparent; border: 1px solid #334155; color: #cbd5e1; box-shadow: none;
  }
  .jobfill-teach button.ghost:hover { background: rgba(99,102,241,.08); }
`;

const PROFILE_PATHS = [
  "personal.first_name", "personal.last_name", "personal.full_name",
  "personal.email", "personal.phone",
  "personal.address_line1", "personal.city", "personal.state", "personal.postal_code", "personal.country",
  "personal.linkedin_url", "personal.github_url", "personal.portfolio_url",
  "personal.work_authorization", "personal.requires_sponsorship",
  "personal.gender", "personal.race", "personal.veteran_status", "personal.disability_status",
];

let teachRoot: HTMLElement | null = null;

export function attachTeachMode(): void {
  ensureStyle();
  document.addEventListener("click", onClick, true);
}

function onClick(ev: MouseEvent): void {
  if (!ev.ctrlKey) return;
  const tgt = ev.target;
  if (!(tgt instanceof HTMLElement)) return;
  if (!isFillableTarget(tgt)) return;
  ev.preventDefault();
  ev.stopPropagation();
  openTeach(tgt, ev.pageX, ev.pageY);
}

function isFillableTarget(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement
      || el instanceof HTMLTextAreaElement
      || el instanceof HTMLSelectElement
      || el.isContentEditable;
}

function openTeach(target: HTMLElement, x: number, y: number): void {
  closeTeach();
  const sig = signatureOf(target);
  const root = document.createElement("div");
  root.className = "jobfill-teach";
  root.style.left = `${x}px`;
  root.style.top  = `${y}px`;
  root.innerHTML = `
    <h5>This field is…</h5>
    <label><input type="radio" name="kind" value="profile_path" checked>
      Profile field:
      <select data-role="profile_select">
        ${PROFILE_PATHS.map(p => `<option value="${p}">${p}</option>`).join("")}
      </select>
    </label>
    <label><input type="radio" name="kind" value="literal">
      Literal text:
      <input type="text" data-role="literal_input" placeholder="e.g. Yes">
    </label>
    <label><input type="radio" name="kind" value="skip">
      Skip on this domain (never auto-fill)
    </label>
    <label><input type="checkbox" data-role="exact_form">
      Apply only to this exact form (not whole domain)
    </label>
    <div class="actions">
      <button data-action="save">Save</button>
      <button data-action="cancel" class="ghost">Cancel</button>
    </div>
  `;

  root.querySelector('[data-action="cancel"]')!.addEventListener("click", closeTeach);
  root.querySelector('[data-action="save"]')!.addEventListener("click", async () => {
    const kind = (root.querySelector('input[name="kind"]:checked') as HTMLInputElement | null)?.value;
    const exactForm = (root.querySelector('[data-role="exact_form"]') as HTMLInputElement).checked;
    let fills_with: FillKind | null = null;
    if (kind === "profile_path") {
      const path = (root.querySelector('[data-role="profile_select"]') as HTMLSelectElement).value;
      fills_with = { kind: "profile_path", path };
    } else if (kind === "literal") {
      const value = (root.querySelector('[data-role="literal_input"]') as HTMLInputElement).value;
      fills_with = { kind: "literal", value };
    } else if (kind === "skip") {
      fills_with = { kind: "skip" };
    }
    if (!fills_with) return;
    const mapping: Mapping = { field_signature: sig, fills_with, scope: exactForm ? "exact_form" : "domain" };
    await addMapping(location.hostname, mapping);
    closeTeach();
  });

  document.documentElement.appendChild(root);
  teachRoot = root;
  document.addEventListener("keydown", onKeyDown, true);
}

function closeTeach(): void {
  teachRoot?.remove();
  teachRoot = null;
  document.removeEventListener("keydown", onKeyDown, true);
}

function onKeyDown(ev: KeyboardEvent): void {
  if (ev.key === "Escape") closeTeach();
}

function signatureOf(el: HTMLElement): FieldSignature {
  let type = el.tagName.toLowerCase();
  if (el instanceof HTMLInputElement) type = el.type || "text";
  return {
    id: el.id ?? "",
    name: (el as HTMLInputElement).name ?? "",
    placeholder: (el as HTMLInputElement).placeholder ?? "",
    type,
    label: el.getAttribute("aria-label") ?? "",
  };
}

function ensureStyle(): void {
  if (document.getElementById("jobfill-teach-style")) return;
  const s = document.createElement("style");
  s.id = "jobfill-teach-style";
  s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}
