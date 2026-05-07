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
    if (el.type === "checkbox") {
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
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function isTruthy(v: string): boolean {
  return /^(true|yes|1|y|on)$/i.test(v.trim());
}
