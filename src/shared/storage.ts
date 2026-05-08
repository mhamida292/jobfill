import type { StorageShape, Profile, PersonalInfo, Snippet, Mapping, Settings, Meta, FieldSignature } from "./types";

export const SCHEMA_VERSION = 1;

export const DEFAULT_STORAGE: StorageShape = {
  profile: {
    personal: {
      first_name: "", last_name: "", email: "",
      phone: "", address_line1: "", city: "", state: "",
      postal_code: "", country: "",
      linkedin_url: "", github_url: "", portfolio_url: "",
      work_authorization: "", requires_sponsorship: false,
      gender: "", race: "", veteran_status: "", disability_status: "",
    },
    work_history: [],
    education: [],
  },
  snippets: [],
  mappings: {},
  settings: {
    hotkey: "Ctrl+Alt+J",
    auto_open_overlay: true,
    iframe_domains: [],
  },
  meta: { schema_version: SCHEMA_VERSION, exported_at: null },
};

// Deep-merge stored data with defaults so additive schema changes (new fields
// in Settings or PersonalInfo) backfill on read without a version bump.
export async function loadAll(): Promise<StorageShape> {
  const stored = await browser.storage.local.get(null) as Partial<StorageShape>;
  // Fall back to fresh empty containers (NOT shared DEFAULT_STORAGE references)
  // so subsequent mutations cannot leak into later loadAll calls.
  return {
    profile:  mergeProfile(stored.profile),
    snippets: stored.snippets ?? [],
    mappings: stored.mappings ?? {},
    settings: mergeSettings(stored.settings),
    meta:     mergeMeta(stored.meta),
  };
}

function mergePersonal(stored: Partial<PersonalInfo> | undefined): PersonalInfo {
  return { ...DEFAULT_STORAGE.profile.personal, ...(stored ?? {}) };
}

function mergeProfile(stored: Partial<Profile> | undefined): Profile {
  return {
    personal: mergePersonal(stored?.personal),
    work_history: stored?.work_history ?? [],
    education:    stored?.education    ?? [],
  };
}

function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_STORAGE.settings, ...(stored ?? {}) };
}

function mergeMeta(stored: Partial<Meta> | undefined): Meta {
  return { ...DEFAULT_STORAGE.meta, ...(stored ?? {}) };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await browser.storage.local.set({ profile });
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await browser.storage.local.set({ snippets });
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

export async function addMapping(domain: string, mapping: Mapping): Promise<void> {
  const data = await loadAll();
  const list = data.mappings[domain] ?? [];
  const idx = list.findIndex(m => sameSignature(m.field_signature, mapping.field_signature));
  if (idx >= 0) list[idx] = mapping;
  else list.push(mapping);
  data.mappings[domain] = list;
  await browser.storage.local.set({ mappings: data.mappings });
}

// Two signatures point at the same field if any non-empty identifier matches.
// Mirrors the lookup priority in matchLearned (id > name > label).
function sameSignature(a: FieldSignature, b: FieldSignature): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.name && b.name && a.name === b.name) return true;
  if (a.label && b.label && a.label === b.label) return true;
  return false;
}

export async function removeMapping(domain: string, index: number): Promise<void> {
  const data = await loadAll();
  const list = data.mappings[domain];
  if (!list) return;
  list.splice(index, 1);
  if (list.length === 0) delete data.mappings[domain];
  await browser.storage.local.set({ mappings: data.mappings });
}

export async function exportJson(): Promise<string> {
  const data = await loadAll();
  data.meta.exported_at = new Date().toISOString();
  return JSON.stringify(data, null, 2);
}

export async function importJson(json: string): Promise<void> {
  const parsed: unknown = JSON.parse(json);
  if (!isValidStorageShape(parsed)) {
    throw new Error(
      "Invalid jobfill export: schema_version must be 1 and required keys must be present.",
    );
  }
  await browser.storage.local.set(parsed);
}

function isValidStorageShape(x: unknown): x is StorageShape {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<StorageShape>;
  if (!s.meta || typeof s.meta !== "object") return false;
  if (s.meta.schema_version !== SCHEMA_VERSION) return false;
  if (!s.profile || typeof s.profile !== "object") return false;
  const profile = s.profile as Partial<Profile>;
  if (!profile.personal || typeof profile.personal !== "object") return false;
  if (!Array.isArray(profile.work_history)) return false;
  if (!Array.isArray(profile.education)) return false;
  if (!Array.isArray(s.snippets)) return false;
  if (!s.mappings || typeof s.mappings !== "object") return false;
  if (!s.settings || typeof s.settings !== "object") return false;
  return true;
}
