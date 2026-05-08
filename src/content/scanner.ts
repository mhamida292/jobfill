import type { FieldSignature } from "../shared/types";

export interface ScannedField {
  element: HTMLElement;
  signature: FieldSignature;
}

// Hidden, submit, button, reset, and image are never fillable.
// File inputs ARE included now (browser security still prevents auto-upload,
// but the overlay surfaces them so the user can find the upload spot quickly).
const SKIPPED_INPUT_TYPES = new Set([
  "hidden", "submit", "button", "reset", "image",
]);

const SELECTOR = [
  "input", "textarea", "select", "[contenteditable=\"true\"]",
].join(",");

// Cap ancestor walks so we don't stitch together unrelated text from far up the tree.
const MAX_ANCESTOR_DEPTH = 5;

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

  const sig: FieldSignature = {
    id:          el.id ?? "",
    name:        (el as HTMLInputElement).name ?? "",
    placeholder: (el as HTMLInputElement).placeholder ?? "",
    type,
    label:       findLabelText(el),
  };
  const automationId = el.getAttribute("data-automation-id");
  if (automationId) sig.data_automation_id = automationId;

  // For checkboxes (and radios), also surface the surrounding "group question"
  // so heuristics can recognize race/gender/etc. by the question, not the option.
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const group = findGroupLabel(el);
    if (group) sig.group_label = group;
  }
  return sig;
}

function findLabelText(el: HTMLElement): string {
  if (el.id) {
    const owned = el.ownerDocument.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (owned?.textContent?.trim()) return owned.textContent.trim();
  }
  const wrapping = el.closest("label");
  if (wrapping) {
    const text = labelTextExcluding(wrapping, el);
    if (text) return text;
  }
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();

  // aria-labelledby may reference multiple IDs separated by whitespace; concatenate.
  const ariaBy = el.getAttribute("aria-labelledby");
  if (ariaBy) {
    const ids = ariaBy.split(/\s+/).filter(Boolean);
    const parts: string[] = [];
    for (const id of ids) {
      const node = el.ownerDocument.getElementById(id);
      const t = node?.textContent?.trim();
      if (t) parts.push(t);
    }
    if (parts.length > 0) return parts.join(" ");
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
  // Walk up ancestor chain (capped) looking for a sibling that holds the question text.
  // Workday wraps inputs and their labels in separate sibling <div>s nested 2-3 levels deep.
  let parent: HTMLElement | null = el.parentElement;
  let depth = 0;
  while (parent && depth < MAX_ANCESTOR_DEPTH) {
    // Look at preceding siblings of the parent for question text.
    let sib: Element | null = parent.previousElementSibling;
    while (sib) {
      if (!hasInputDescendant(sib)) {
        const t = sib.textContent?.trim();
        if (t) return t;
      }
      sib = sib.previousElementSibling;
    }
    // Look at child elements of the parent that don't contain inputs and precede el.
    let cur: Node | null = parent.firstChild;
    let collected = "";
    while (cur && !contains(cur, el)) {
      if (cur.nodeType === Node.ELEMENT_NODE && !hasInputDescendant(cur as Element)) {
        const t = (cur as Element).textContent?.trim();
        if (t) collected = t;
      } else if (cur.nodeType === Node.TEXT_NODE) {
        const t = cur.textContent?.trim();
        if (t) collected = t;
      }
      cur = cur.nextSibling;
    }
    if (collected) return collected;
    parent = parent.parentElement;
    depth++;
  }
  return "";
}

// Returns the wrapping label's text minus any input/select/textarea contents
// inside it. Iterates child nodes instead of doing a fragile string replace.
function labelTextExcluding(label: Element, exclude: HTMLElement): string {
  let out = "";
  const walker = label.ownerDocument.createTreeWalker(label, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (!contains(exclude, node)) {
      const t = node.textContent ?? "";
      if (t.trim()) out += (out ? " " : "") + t.trim();
    }
    node = walker.nextNode();
  }
  return out.trim();
}

function contains(parent: Node, child: Node): boolean {
  return parent === child || parent.contains(child);
}

function hasInputDescendant(el: Element): boolean {
  return !!el.querySelector("input, textarea, select, [contenteditable=\"true\"]");
}

// Find the question text for a checkbox/radio that's part of a group:
// fieldset > legend, or [role=group] with aria-label / aria-labelledby.
function findGroupLabel(el: HTMLElement): string {
  let cur: HTMLElement | null = el.parentElement;
  let depth = 0;
  while (cur && depth < MAX_ANCESTOR_DEPTH + 2) {
    if (cur.tagName === "FIELDSET") {
      const legend = cur.querySelector("legend");
      const t = legend?.textContent?.trim();
      if (t) return t;
    }
    if (cur.getAttribute("role") === "group" || cur.getAttribute("role") === "radiogroup") {
      const aria = cur.getAttribute("aria-label");
      if (aria?.trim()) return aria.trim();
      const ariaBy = cur.getAttribute("aria-labelledby");
      if (ariaBy) {
        const ids = ariaBy.split(/\s+/).filter(Boolean);
        const parts: string[] = [];
        for (const id of ids) {
          const node = cur.ownerDocument.getElementById(id);
          const t = node?.textContent?.trim();
          if (t) parts.push(t);
        }
        if (parts.length > 0) return parts.join(" ");
      }
    }
    cur = cur.parentElement;
    depth++;
  }
  return "";
}

// Use the native CSS.escape when available (browsers + happy-dom);
// fall back to a minimal version for environments lacking it.
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
