import type { FieldSignature } from "../shared/types";

export interface ScannedField {
  element: HTMLElement;
  signature: FieldSignature;
}

const SKIPPED_INPUT_TYPES = new Set([
  "hidden", "submit", "button", "reset", "image", "file",
]);

const SELECTOR = [
  "input", "textarea", "select", "[contenteditable=\"true\"]",
].join(",");

export function scanFields(root: ParentNode = document.body): ScannedField[] {
  const out: ScannedField[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (!isFillable(el)) continue;
    out.push({ element: el, signature: buildSignature(el) });
  }
  return out;
}

function isFillable(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).disabled) return false;
  if ((el as HTMLInputElement).readOnly) return false;
  if (el instanceof HTMLInputElement) {
    if (SKIPPED_INPUT_TYPES.has(el.type)) return false;
  }
  return true;
}

function buildSignature(el: HTMLElement): FieldSignature {
  const tag = el.tagName.toLowerCase();
  let type = tag;
  if (el instanceof HTMLInputElement) type = el.type || "text";

  return {
    id:          el.id ?? "",
    name:        (el as HTMLInputElement).name ?? "",
    placeholder: (el as HTMLInputElement).placeholder ?? "",
    type,
    label:       findLabelText(el),
  };
}

function findLabelText(el: HTMLElement): string {
  if (el.id) {
    const owned = el.ownerDocument.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (owned?.textContent?.trim()) return owned.textContent.trim();
  }
  const wrapping = el.closest("label");
  if (wrapping?.textContent?.trim()) {
    const text = wrapping.textContent.replace(el.textContent ?? "", "").trim();
    if (text) return text;
  }
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();

  const ariaBy = el.getAttribute("aria-labelledby");
  if (ariaBy) {
    const labelledBy = el.ownerDocument.getElementById(ariaBy);
    if (labelledBy?.textContent?.trim()) return labelledBy.textContent.trim();
  }
  // Nearest preceding non-empty text node within the same form/section.
  let node: Node | null = el.previousSibling;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const t = (node as Element).textContent?.trim();
      if (t) return t;
    } else if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) return t;
    }
    node = node.previousSibling;
  }
  // Walk up one level if still empty.
  if (el.parentElement) {
    let cur: Node | null = el.parentElement.firstChild;
    let lastText = "";
    while (cur && cur !== el) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        const t = (cur as Element).textContent?.trim();
        if (t) lastText = t;
      }
      cur = cur.nextSibling;
    }
    if (lastText) return lastText;
  }
  return "";
}

function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
