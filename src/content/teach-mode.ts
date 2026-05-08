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
  "work_history.0.company", "work_history.0.title", "work_history.0.description", "work_history.0.location",
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
  const root = el("div", { class: "jobfill-teach" });
  root.style.left = `${x}px`;
  root.style.top  = `${y}px`;

  root.appendChild(el("h5", {}, "This field is…"));

  const profilePathSelect = el("select", { "data-role": "profile_select" }) as HTMLSelectElement;
  for (const p of PROFILE_PATHS) {
    profilePathSelect.appendChild(el("option", { value: p }, p));
  }

  const radio = (value: string, checked = false): HTMLInputElement => {
    const r = el("input", { type: "radio", name: "kind", value }) as HTMLInputElement;
    r.checked = checked;
    return r;
  };

  root.appendChild(el("label", {},
    radio("profile_path", true),
    document.createTextNode("Profile field: "),
    profilePathSelect,
  ));
  const literalInput = el("input", { type: "text", "data-role": "literal_input", placeholder: "e.g. Yes" }) as HTMLInputElement;
  root.appendChild(el("label", {},
    radio("literal"),
    document.createTextNode("Literal text: "),
    literalInput,
  ));
  root.appendChild(el("label", {},
    radio("skip"),
    document.createTextNode("Skip on this domain (never auto-fill)"),
  ));

  const exactCb = el("input", { type: "checkbox", "data-role": "exact_form" }) as HTMLInputElement;
  root.appendChild(el("label", {}, exactCb, document.createTextNode("Apply only to this exact form (not whole domain)")));

  const saveBtn = el("button", { "data-action": "save" }, "Save");
  const cancelBtn = el("button", { "data-action": "cancel", class: "ghost" }, "Cancel");
  cancelBtn.addEventListener("click", closeTeach);
  saveBtn.addEventListener("click", async () => {
    const kindEl = root.querySelector('input[name="kind"]:checked') as HTMLInputElement | null;
    const kind = kindEl?.value;
    let fills_with: FillKind | null = null;
    if (kind === "profile_path") {
      fills_with = { kind: "profile_path", path: profilePathSelect.value };
    } else if (kind === "literal") {
      fills_with = { kind: "literal", value: literalInput.value };
    } else if (kind === "skip") {
      fills_with = { kind: "skip" };
    }
    if (!fills_with) return;
    const mapping: Mapping = { field_signature: sig, fills_with, scope: exactCb.checked ? "exact_form" : "domain" };
    await addMapping(location.hostname, mapping);
    closeTeach();
  });
  root.appendChild(el("div", { class: "actions" }, saveBtn, cancelBtn));

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
  const sig: FieldSignature = {
    id: el.id ?? "",
    name: (el as HTMLInputElement).name ?? "",
    placeholder: (el as HTMLInputElement).placeholder ?? "",
    type,
    label: el.getAttribute("aria-label") ?? "",
  };
  const aid = el.getAttribute("data-automation-id");
  if (aid) sig.data_automation_id = aid;
  return sig;
}

function ensureStyle(): void {
  if (document.getElementById("jobfill-teach-style")) return;
  const s = document.createElement("style");
  s.id = "jobfill-teach-style";
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
