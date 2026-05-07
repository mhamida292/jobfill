import type { StorageShape, Profile, Snippet, Mapping, Settings } from "./types";

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
  settings: { hotkey: "Ctrl+Shift+J", auto_open_overlay: true },
  meta: { schema_version: 1, exported_at: null },
};

export async function loadAll(): Promise<StorageShape> {
  const stored = await browser.storage.local.get(null) as Partial<StorageShape>;
  return {
    profile:  stored.profile  ?? DEFAULT_STORAGE.profile,
    snippets: stored.snippets ?? DEFAULT_STORAGE.snippets,
    mappings: stored.mappings ?? DEFAULT_STORAGE.mappings,
    settings: stored.settings ?? DEFAULT_STORAGE.settings,
    meta:     stored.meta     ?? DEFAULT_STORAGE.meta,
  };
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
  list.push(mapping);
  data.mappings[domain] = list;
  await browser.storage.local.set({ mappings: data.mappings });
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
  const parsed = JSON.parse(json) as StorageShape;
  await browser.storage.local.set(parsed);
}
