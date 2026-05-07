export interface InterpolationResult {
  text: string;
  unresolved: string[];
}

export function interpolate(
  template: string,
  vars: Record<string, string>,
): InterpolationResult {
  const unresolved: string[] = [];
  const text = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const value = vars[name];
    if (!value) {
      if (!unresolved.includes(name)) unresolved.push(name);
      return `{{${name}}}`;
    }
    return value;
  });
  return { text, unresolved };
}

export interface PageVars {
  company: string;
  role: string;
}

export function extractPageVars(doc: Document, url: URL): PageVars {
  const title = doc.title.trim();
  const h1 = doc.querySelector("h1")?.textContent?.trim() ?? "";

  // Role: prefer H1, fall back to title (often "Role at Company").
  let role = h1;
  if (!role && title) {
    const m = /^(.*?)\s+(?:at|@|—|-)\s+/i.exec(title);
    role = m ? m[1]!.trim() : title;
  }

  // Company: try title's "at X" suffix, else URL hostname segment.
  let company = "";
  const titleAt = /\s+(?:at|@|—|-)\s+(.+)$/i.exec(title);
  if (titleAt) {
    company = titleAt[1]!.trim();
  } else {
    const host = url.hostname;
    // greenhouse: boards.greenhouse.io/acme/...
    if (host.endsWith("greenhouse.io")) {
      const seg = url.pathname.split("/").filter(Boolean)[0];
      if (seg) company = seg;
    } else {
      const parts = host.split(".");
      if (parts.length >= 2) company = parts[parts.length - 2]!;
    }
  }

  return { company, role };
}
