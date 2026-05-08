import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StorageShape, Profile, Mapping } from "../../src/shared/types";

const localStore: Record<string, unknown> = {};
const browserMock = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[]) => {
        if (!keys) return { ...localStore };
        const arr = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(arr.filter(k => k in localStore).map(k => [k, localStore[k]]));
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(localStore, items);
      }),
      clear: vi.fn(async () => {
        for (const k of Object.keys(localStore)) delete localStore[k];
      }),
    },
  },
};
// @ts-expect-error injecting global
globalThis.browser = browserMock;

beforeEach(async () => {
  await browserMock.storage.local.clear();
  vi.clearAllMocks();
});

describe("storage façade", () => {
  it("returns defaults on first read", async () => {
    const { loadAll } = await import("../../src/shared/storage");
    const data = await loadAll();
    expect(data.profile.personal.email).toBe("");
    expect(data.snippets).toEqual([]);
    expect(data.mappings).toEqual({});
    expect(data.meta.schema_version).toBe(1);
  });

  it("round-trips a profile", async () => {
    const { saveProfile, loadAll } = await import("../../src/shared/storage");
    const p: Profile = {
      personal: { first_name: "Mo", last_name: "Q", email: "m@x.com",
        phone: "", address_line1: "", city: "", state: "", postal_code: "",
        country: "", linkedin_url: "", github_url: "", portfolio_url: "",
        work_authorization: "us_citizen", requires_sponsorship: false,
        gender: "", race: "", veteran_status: "", disability_status: "" },
      work_history: [], education: [],
    };
    await saveProfile(p);
    const data = await loadAll();
    expect(data.profile.personal.first_name).toBe("Mo");
  });

  it("appends a learned mapping by domain", async () => {
    const { addMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("greenhouse.io", {
      field_signature: { label: "Phone", name: "phone", id: "applicant_phone", placeholder: "", type: "tel" },
      fills_with: { kind: "profile_path", path: "personal.phone" },
      scope: "domain",
    });
    const data = await loadAll();
    expect(data.mappings["greenhouse.io"]?.length).toBe(1);
  });
});

describe("safe-merge on loadAll", () => {
  it("backfills missing PersonalInfo fields when stored profile predates a field", async () => {
    const { loadAll } = await import("../../src/shared/storage");
    // Store a profile that omits the disability_status field (simulating an old version).
    await browserMock.storage.local.set({
      profile: {
        personal: { first_name: "Mo", last_name: "Q", email: "m@x.com" },
        work_history: [], education: [],
      },
    });
    const data = await loadAll();
    expect(data.profile.personal.first_name).toBe("Mo");
    expect(data.profile.personal.disability_status).toBe("");
    expect(data.profile.personal.requires_sponsorship).toBe(false);
  });

  it("backfills missing Settings fields (e.g. iframe_domains added later)", async () => {
    const { loadAll } = await import("../../src/shared/storage");
    await browserMock.storage.local.set({
      settings: { hotkey: "Ctrl+Alt+J", auto_open_overlay: true },
    });
    const data = await loadAll();
    expect(data.settings.iframe_domains).toEqual([]);
  });
});

describe("addMapping deduplication", () => {
  const mk = (over: Partial<Mapping["field_signature"]> = {}): Mapping => ({
    field_signature: { label: "", name: "", id: "", placeholder: "", type: "text", ...over },
    fills_with: { kind: "profile_path", path: "personal.email" },
    scope: "domain",
  });

  it("replaces an existing mapping with matching id rather than appending a duplicate", async () => {
    const { addMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("ex.com", mk({ id: "email" }));
    await addMapping("ex.com", { ...mk({ id: "email" }), fills_with: { kind: "literal", value: "new@x.com" } });
    const data = await loadAll();
    expect(data.mappings["ex.com"]?.length).toBe(1);
    expect(data.mappings["ex.com"]![0]!.fills_with).toEqual({ kind: "literal", value: "new@x.com" });
  });

  it("treats two different fields as distinct (different ids → both stored)", async () => {
    const { addMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("ex.com", mk({ id: "email" }));
    await addMapping("ex.com", mk({ id: "phone" }));
    const data = await loadAll();
    expect(data.mappings["ex.com"]?.length).toBe(2);
  });

  it("dedupes by name when ids are absent", async () => {
    const { addMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("ex.com", mk({ name: "applicant_email" }));
    await addMapping("ex.com", mk({ name: "applicant_email" }));
    const data = await loadAll();
    expect(data.mappings["ex.com"]?.length).toBe(1);
  });
});

describe("removeMapping", () => {
  const mk = (id: string): Mapping => ({
    field_signature: { label: "", name: "", id, placeholder: "", type: "text" },
    fills_with: { kind: "profile_path", path: "personal.email" },
    scope: "domain",
  });

  it("removes one entry but keeps the domain key when entries remain", async () => {
    const { addMapping, removeMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("ex.com", mk("a"));
    await addMapping("ex.com", mk("b"));
    await removeMapping("ex.com", 0);
    const data = await loadAll();
    expect(data.mappings["ex.com"]?.length).toBe(1);
    expect(data.mappings["ex.com"]![0]!.field_signature.id).toBe("b");
  });

  it("deletes the domain key when removing the last entry", async () => {
    const { addMapping, removeMapping, loadAll } = await import("../../src/shared/storage");
    await addMapping("ex.com", mk("a"));
    await removeMapping("ex.com", 0);
    const data = await loadAll();
    expect(data.mappings["ex.com"]).toBeUndefined();
    expect(Object.keys(data.mappings)).toEqual([]);
  });

  it("is a no-op for unknown domains", async () => {
    const { removeMapping } = await import("../../src/shared/storage");
    await expect(removeMapping("nope.com", 0)).resolves.toBeUndefined();
  });
});

describe("importJson validation", () => {
  function validShape(): StorageShape {
    return {
      profile: {
        personal: { first_name: "", last_name: "", email: "", phone: "",
          address_line1: "", city: "", state: "", postal_code: "", country: "",
          linkedin_url: "", github_url: "", portfolio_url: "",
          work_authorization: "", requires_sponsorship: false,
          gender: "", race: "", veteran_status: "", disability_status: "" },
        work_history: [], education: [],
      },
      snippets: [], mappings: {},
      settings: { hotkey: "Ctrl+Alt+J", auto_open_overlay: true, iframe_domains: [] },
      meta: { schema_version: 1, exported_at: null },
    };
  }

  it("accepts a well-formed export", async () => {
    const { importJson, loadAll } = await import("../../src/shared/storage");
    await importJson(JSON.stringify(validShape()));
    const data = await loadAll();
    expect(data.meta.schema_version).toBe(1);
  });

  it("rejects export with missing meta.schema_version", async () => {
    const { importJson } = await import("../../src/shared/storage");
    const bad = validShape() as unknown as Record<string, unknown>;
    delete (bad as { meta?: unknown }).meta;
    await expect(importJson(JSON.stringify(bad))).rejects.toThrow(/schema/);
  });

  it("rejects export with wrong schema_version", async () => {
    const { importJson } = await import("../../src/shared/storage");
    const bad = validShape();
    bad.meta.schema_version = 99;
    await expect(importJson(JSON.stringify(bad))).rejects.toThrow(/schema/);
  });

  it("rejects export missing top-level keys", async () => {
    const { importJson } = await import("../../src/shared/storage");
    const bad = validShape() as unknown as Record<string, unknown>;
    delete bad.snippets;
    await expect(importJson(JSON.stringify(bad))).rejects.toThrow(/schema/);
  });

  it("rejects malformed JSON", async () => {
    const { importJson } = await import("../../src/shared/storage");
    await expect(importJson("not json{")).rejects.toThrow();
  });

  it("rejects when work_history is not an array", async () => {
    const { importJson } = await import("../../src/shared/storage");
    const bad = validShape() as unknown as { profile: { work_history: unknown } };
    bad.profile.work_history = { fake: true };
    await expect(importJson(JSON.stringify(bad))).rejects.toThrow(/schema/);
  });
});
