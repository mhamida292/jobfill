import type { Profile } from "../shared/types";
import { resolveOption } from "../shared/synonyms";

export interface FillResult {
  ok: boolean;
  reason?: string;
}

export function getProfileValue(profile: Profile, path: string): string {
  // Special case: full_name (composed)
  if (path === "personal.full_name") {
    return `${profile.personal.first_name} ${profile.personal.last_name}`.trim();
  }
  const parts = path.split(".");
  let cur: unknown = profile;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return "";
    }
  }
  if (cur === null || cur === undefined) return "";
  return String(cur);
}

export function fillElement(
  el: HTMLElement,
  value: string,
  _profile: Profile,
  profilePath?: string,
): FillResult {
  if (el instanceof HTMLSelectElement) {
    return fillSelect(el, value, profilePath);
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === "file") {
      return { ok: false, reason: "file input — pick file manually" };
    }
    if (el.type === "checkbox") {
      // Group-aware fill: when the matched profile path holds a single value
      // (e.g. personal.race) but the form renders one checkbox per option,
      // tick only the option that matches the user's value and clear siblings.
      if (profilePath && isGroupedCheckbox(el)) {
        return fillCheckboxGroup(el, value);
      }
      el.checked = isTruthy(value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }
    if (el.type === "radio") {
      // Find sibling radio in same name with matching value/label.
      const radios = el.form
        ? Array.from(el.form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${el.name}"]`))
        : [el];
      const opts = radios.map(r => ({ value: r.value, text: labelTextFor(r) || r.value }));
      const resolved = profilePath ? resolveOption(profilePath, value, opts) : null;
      const target = resolved
        ? radios.find(r => r.value === resolved.value)
        : radios.find(r => r.value.toLowerCase() === value.toLowerCase());
      if (!target) return { ok: false, reason: "no matching radio option" };
      target.checked = true;
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }
  if (el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }
  if (el.isContentEditable) {
    el.textContent = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return { ok: true };
  }
  return { ok: false, reason: "unsupported element" };
}

function fillSelect(el: HTMLSelectElement, value: string, profilePath?: string): FillResult {
  const opts = Array.from(el.options).map(o => ({ value: o.value, text: o.textContent ?? "" }));
  const resolved = profilePath ? resolveOption(profilePath, value, opts) : null;
  const targetValue = resolved?.value
    ?? opts.find(o => o.value.toLowerCase() === value.toLowerCase())?.value
    ?? null;
  if (targetValue === null) return { ok: false, reason: "could not map value to options" };
  el.value = targetValue;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return { ok: true };
}

function labelTextFor(el: HTMLElement): string {
  if (el.id) {
    const lab = el.ownerDocument.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (lab?.textContent?.trim()) return lab.textContent.trim();
  }
  const wrap = el.closest("label");
  return wrap?.textContent?.trim() ?? "";
}

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function isTruthy(v: string): boolean {
  return /^(true|yes|1|y|on)$/i.test(v.trim());
}

// A checkbox is "grouped" if it has siblings that share its `name` (the standard
// HTML pattern for multi-select) or if it sits inside a fieldset/role=group with
// other checkboxes.
function isGroupedCheckbox(el: HTMLInputElement): boolean {
  if (el.name && el.form) {
    const sib = el.form.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${cssEscape(el.name)}"]`,
    );
    if (sib.length > 1) return true;
  }
  const group = el.closest("fieldset, [role=\"group\"], [role=\"radiogroup\"]");
  if (group) {
    const cbs = group.querySelectorAll('input[type="checkbox"]');
    if (cbs.length > 1) return true;
  }
  return false;
}

// Tick only the checkbox in the group whose option label matches `value`.
// Clears the others so re-fills don't accumulate stale checks.
function fillCheckboxGroup(anchor: HTMLInputElement, value: string): FillResult {
  const group = collectGroup(anchor);
  if (group.length === 0) return { ok: false, reason: "empty checkbox group" };

  const target = pickGroupOption(group, value);
  if (!target) return { ok: false, reason: "no matching option in group" };

  for (const cb of group) {
    const want = cb === target;
    if (cb.checked !== want) {
      cb.checked = want;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  return { ok: true };
}

function collectGroup(anchor: HTMLInputElement): HTMLInputElement[] {
  if (anchor.name && anchor.form) {
    const sib = Array.from(anchor.form.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${cssEscape(anchor.name)}"]`,
    ));
    if (sib.length > 1) return sib;
  }
  const wrapper = anchor.closest("fieldset, [role=\"group\"], [role=\"radiogroup\"]");
  if (wrapper) {
    return Array.from(wrapper.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  }
  return [anchor];
}

function pickGroupOption(group: HTMLInputElement[], value: string): HTMLInputElement | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  // 1) Exact value match (case-insensitive).
  for (const cb of group) {
    if (cb.value && cb.value.toLowerCase() === v) return cb;
  }
  // 2) Exact label-text match.
  for (const cb of group) {
    const label = labelTextFor(cb).toLowerCase();
    if (label && label === v) return cb;
  }
  // 3) Fuzzy contains on label text.
  for (const cb of group) {
    const label = labelTextFor(cb).toLowerCase();
    if (label && label.includes(v)) return cb;
  }
  return null;
}
