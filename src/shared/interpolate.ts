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
    role = stripTitleSuffix(m ? m[1]!.trim() : title);
  }

  // Company: try title's "at X" suffix first.
  let company = "";
  const titleAt = /\s+(?:at|@|—|-)\s+(.+)$/i.exec(title);
  if (titleAt) {
    company = stripTitleSuffix(titleAt[1]!.trim());
  } else {
    company = companyFromHost(url);
  }

  return { company, role };
}

// Pull the brand segment out of a hostname.
// - greenhouse.io → uses the first path segment (boards.greenhouse.io/acme/...)
// - foo.com / bar.foo.com → "foo"
// - localhost / single-label / IPs → return the host as-is so {{company}} isn't blank.
function companyFromHost(url: URL): string {
  const host = url.hostname;
  if (!host) return "";
  if (host.endsWith("greenhouse.io")) {
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg) return seg;
  }
  // IPv4 literal → no useful company name.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const parts = host.split(".");
  if (parts.length >= 2) return parts[parts.length - 2]!;
  // Single label (e.g. "localhost"). Return as-is so {{company}} resolves to
  // *something* during local testing.
  return host;
}

// Page titles often append a brand or section after a separator
// ("Acme | Careers", "Acme - Jobs", "Acme · Engineering"). Strip them.
function stripTitleSuffix(s: string): string {
  return s
    .replace(/\s*[|·]\s+.+$/, "")
    .replace(/\s+-\s+.+$/, "")
    .trim();
}
