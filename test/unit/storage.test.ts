import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StorageShape, Profile } from "../../src/shared/types";

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
