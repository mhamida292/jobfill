import type { Profile, PersonalInfo, Snippet, Mapping, Settings } from "../shared/types";
import { loadAll, saveProfile, saveSnippets, saveSettings, removeMapping, exportJson, importJson } from "../shared/storage";
import { interpolate } from "../shared/interpolate";

const PERSONAL_FIELDS: { key: keyof PersonalInfo; type?: string }[] = [
  { key: "first_name" }, { key: "last_name" }, { key: "email", type: "email" },
  { key: "phone", type: "tel" }, { key: "address_line1" }, { key: "city" },
  { key: "state" }, { key: "postal_code" }, { key: "country" },
  { key: "linkedin_url", type: "url" }, { key: "github_url", type: "url" }, { key: "portfolio_url", type: "url" },
  { key: "work_authorization" }, { key: "gender" }, { key: "race" },
  { key: "veteran_status" }, { key: "disability_status" },
];

// Fake values used for snippet preview when no live page is available.
const PREVIEW_VARS = { company: "Acme Inc.", role: "Software Engineer" };

async function init(): Promise<void> {
  document.querySelectorAll<HTMLButtonElement>(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset["tab"]!}`)!.classList.add("active");
    });
  });

  const data = await loadAll();
  renderProfile(data.profile);
  renderSnippets(data.snippets);
  renderMappings(data.mappings, data.settings);
}

// ---------- DOM helpers ----------

type ElAttrs = Record<string, string | boolean | number>;
type ElChild = Node | string | null | undefined;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs?: ElAttrs, ...children: ElChild[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v === null || v === undefined) continue;
      if (v === true) node.setAttribute(k, "");
      else node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function flashStatus(node: HTMLElement, text: string, ms = 1500): void {
  node.textContent = text;
  setTimeout(() => { node.textContent = ""; }, ms);
}

// ---------- Profile tab ----------

function renderProfile(p: Profile): void {
  const personal = document.getElementById("personal-fields")!;
  clear(personal);

  for (const f of PERSONAL_FIELDS) {
    const input = el("input", {
      "data-pkey": f.key,
      type: f.type ?? "text",
      value: String(p.personal[f.key] ?? ""),
    });
    personal.appendChild(el("label", {}, el("span", {}, f.key), input));
  }
  // requires_sponsorship is a boolean, rendered as a checkbox.
  const cb = el("input", { "data-pkey": "requires_sponsorship", type: "checkbox" }) as HTMLInputElement;
  cb.checked = p.personal.requires_sponsorship;
  personal.appendChild(el("label", {}, el("span", {}, "requires_sponsorship"), cb));

  const workList = document.getElementById("work-list")!;
  const renderWork = (): void => {
    clear(workList);
    p.work_history.forEach((w, i) => {
      workList.appendChild(workRow(w, i, () => {
        p.work_history.splice(i, 1);
        renderWork();
      }));
    });
  };
  renderWork();

  document.getElementById("add-work")!.addEventListener("click", () => {
    p.work_history.push({ company: "", title: "", start_date: "", end_date: "", current: false, location: "", description: "" });
    renderWork();
  });

  const eduList = document.getElementById("edu-list")!;
  const renderEdu = (): void => {
    clear(eduList);
    p.education.forEach((e, i) => {
      eduList.appendChild(eduRow(e, i, () => {
        p.education.splice(i, 1);
        renderEdu();
      }));
    });
  };
  renderEdu();

  document.getElementById("add-edu")!.addEventListener("click", () => {
    p.education.push({ school: "", degree: "", field: "", start_date: "", end_date: "", gpa: "" });
    renderEdu();
  });

  document.getElementById("save-profile")!.addEventListener("click", async () => {
    document.querySelectorAll<HTMLInputElement>("[data-pkey]").forEach(input => {
      const key = input.dataset["pkey"] as keyof PersonalInfo;
      if (input.type === "checkbox") (p.personal as Record<keyof PersonalInfo, unknown>)[key] = input.checked;
      else (p.personal as Record<keyof PersonalInfo, unknown>)[key] = input.value;
    });
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-w]").forEach(input => {
      const i = Number(input.dataset["w"]);
      const k = input.dataset["k"] as keyof Profile["work_history"][number];
      const w = p.work_history[i]!;
      if (input instanceof HTMLInputElement && input.type === "checkbox") {
        (w as unknown as Record<string, unknown>)[k] = input.checked;
      } else {
        (w as unknown as Record<string, unknown>)[k] = input.value;
      }
    });
    document.querySelectorAll<HTMLInputElement>("[data-e]").forEach(input => {
      const i = Number(input.dataset["e"]);
      const k = input.dataset["k"] as keyof Profile["education"][number];
      (p.education[i]! as unknown as Record<string, unknown>)[k] = input.value;
    });
    await saveProfile(p);
    flashStatus(document.getElementById("save-status")!, "Saved");
  });
}

function workRow(w: Profile["work_history"][number], i: number, onRemove: () => void): HTMLElement {
  const row = el("div", { class: "row" });
  const inp = (k: string, placeholder: string, value: string, type = "text"): HTMLInputElement =>
    el("input", { "data-w": i, "data-k": k, placeholder, type, value }) as HTMLInputElement;

  row.appendChild(inp("company",    "Company",  w.company));
  row.appendChild(inp("title",      "Title",    w.title));
  row.appendChild(inp("location",   "Location", w.location));

  const dateRow = el("div", { class: "inline-pair" },
    inp("start_date", "Start (YYYY-MM)", w.start_date),
    inp("end_date",   "End (YYYY-MM)",   w.end_date),
  );
  row.appendChild(dateRow);

  const currentCb = el("input", {
    "data-w": i, "data-k": "current", type: "checkbox",
  }) as HTMLInputElement;
  currentCb.checked = w.current;
  // When "current" is checked, end_date is meaningless; visually fade it.
  const endInput = row.querySelector<HTMLInputElement>(`[data-k="end_date"][data-w="${i}"]`)!;
  const syncEndDisable = (): void => {
    endInput.disabled = currentCb.checked;
    endInput.style.opacity = currentCb.checked ? "0.5" : "1";
    if (currentCb.checked) endInput.value = "";
  };
  syncEndDisable();
  currentCb.addEventListener("change", syncEndDisable);
  row.appendChild(el("label", { class: "checkbox-row" },
    currentCb, el("span", {}, "Current role"),
  ));

  const desc = el("textarea", {
    "data-w": i, "data-k": "description",
    placeholder: "Describe your responsibilities, achievements, technologies used…",
  }) as HTMLTextAreaElement;
  desc.value = w.description;
  row.appendChild(desc);

  const removeBtn = el("button", { "data-action": "rm-work", "data-i": i }, "×");
  removeBtn.addEventListener("click", onRemove);
  row.appendChild(removeBtn);
  return row;
}

function eduRow(e: Profile["education"][number], i: number, onRemove: () => void): HTMLElement {
  const row = el("div", { class: "row" });
  const inp = (k: string, placeholder: string, value: string): HTMLInputElement =>
    el("input", { "data-e": i, "data-k": k, placeholder, value }) as HTMLInputElement;
  row.appendChild(inp("school", "School", e.school));
  row.appendChild(inp("degree", "Degree", e.degree));
  row.appendChild(inp("field",  "Field",  e.field));
  const removeBtn = el("button", { "data-action": "rm-edu", "data-i": i }, "×");
  removeBtn.addEventListener("click", onRemove);
  row.appendChild(removeBtn);
  return row;
}

// ---------- Snippets tab ----------

function renderSnippets(snippets: Snippet[]): void {
  const root = document.getElementById("tab-snippets")!;
  for (const s of snippets) if (!s.id) s.id = crypto.randomUUID();

  const draw = (): void => {
    clear(root);
    root.appendChild(el("h3", {}, "Snippets"));
    const list = el("div", { id: "snippet-list" });
    snippets.forEach((s, i) => list.appendChild(snippetRow(s, i, () => {
      snippets.splice(i, 1);
      draw();
    })));
    root.appendChild(list);

    const addBtn = el("button", { id: "add-s", class: "ghost" }, "+ Add snippet");
    addBtn.addEventListener("click", () => {
      snippets.push({ id: crypto.randomUUID(), label: "", body: "", tags: [] });
      draw();
    });
    const saveBtn = el("button", { id: "save-s" }, "Save");
    const status = el("span", { id: "snippet-status" });
    saveBtn.addEventListener("click", async () => {
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-s]").forEach(input => {
        const i = Number(input.dataset["s"]);
        const k = input.dataset["k"] as "label" | "tags" | "body";
        if (k === "tags") snippets[i]!.tags = input.value.split(",").map(t => t.trim()).filter(Boolean);
        else (snippets[i] as unknown as Record<string, unknown>)[k] = input.value;
      });
      await saveSnippets(snippets);
      flashStatus(status, "Saved");
    });
    root.appendChild(el("div", { class: "footer" }, addBtn, saveBtn, status));
  };
  draw();
}

function snippetRow(s: Snippet, i: number, onRemove: () => void): HTMLElement {
  const row = el("div", { class: "row" });
  const labelInput = el("input", {
    "data-s": i, "data-k": "label", placeholder: "Label", value: s.label,
  }) as HTMLInputElement;
  const tagsInput = el("input", {
    "data-s": i, "data-k": "tags", placeholder: "Tags (comma-separated)", value: s.tags.join(","),
  }) as HTMLInputElement;
  const body = el("textarea", {
    "data-s": i, "data-k": "body",
    placeholder: "Body. Use {{company}} and {{role}} for interpolation.",
  }) as HTMLTextAreaElement;
  body.value = s.body;

  const previewBlock = el("div", { class: "snippet-preview" });
  previewBlock.style.display = "none";

  const previewBtn = el("button", { class: "ghost" }, "Preview");
  previewBtn.addEventListener("click", () => {
    if (previewBlock.style.display === "none") {
      renderPreview(previewBlock, body.value);
      previewBtn.textContent = "Hide preview";
      previewBlock.style.display = "block";
    } else {
      previewBtn.textContent = "Preview";
      previewBlock.style.display = "none";
    }
  });

  const removeBtn = el("button", { "data-action": "rm-s", "data-i": i }, "Delete");
  removeBtn.addEventListener("click", onRemove);

  row.appendChild(labelInput);
  row.appendChild(tagsInput);
  row.appendChild(body);
  row.appendChild(el("div", { class: "snippet-actions" }, previewBtn, removeBtn));
  row.appendChild(previewBlock);
  return row;
}

// Render the snippet body with {{company}}/{{role}} resolved against fake values.
// Unresolved vars are wrapped in a yellow chip so the user sees what's missing.
function renderPreview(target: HTMLElement, body: string): void {
  clear(target);
  const out = interpolate(body, PREVIEW_VARS);
  // Walk the result and turn any leftover {{var}} into a span; everything else is plain text.
  const parts = out.text.split(/(\{\{\s*\w+\s*\}\})/g);
  for (const part of parts) {
    const m = /^\{\{\s*(\w+)\s*\}\}$/.exec(part);
    if (m) {
      target.appendChild(el("span", { class: "unresolved" }, part));
    } else if (part) {
      target.appendChild(document.createTextNode(part));
    }
  }
  if (out.unresolved.length === 0 && body.trim().length > 0) {
    target.appendChild(el("div", { class: "preview-hint" },
      `Preview uses fake values: company="${PREVIEW_VARS.company}", role="${PREVIEW_VARS.role}".`));
  }
}

// ---------- Mappings tab ----------

function renderMappings(mappings: Record<string, Mapping[]>, settings: Settings): void {
  const root = document.getElementById("tab-mappings")!;
  const draw = (): void => {
    clear(root);
    root.appendChild(el("h3", {}, "Learned mappings"));
    const domains = Object.keys(mappings).sort();
    if (domains.length === 0) {
      root.appendChild(el("p", {},
        "No mappings learned yet. Ctrl-click a field on a form to teach jobfill."));
    }
    for (const d of domains) {
      const det = el("details");
      det.appendChild(el("summary", {}, `${d} (${mappings[d]!.length})`));
      const ul = el("ul");
      mappings[d]!.forEach((m, i) => {
        const li = el("li");
        li.appendChild(el("code", {},
          m.field_signature.label || m.field_signature.name || m.field_signature.id || "(field)"));
        li.appendChild(document.createTextNode(" → "));
        li.appendChild(el("code", {}, describeFill(m)));
        const rm = el("button", { "data-action": "rm-m" }, "×");
        rm.addEventListener("click", async () => {
          await removeMapping(d, i);
          const data = await loadAll();
          renderMappings(data.mappings, data.settings);
        });
        li.appendChild(rm);
        ul.appendChild(li);
      });
      det.appendChild(ul);
      root.appendChild(det);
    }
    const exportBtn = el("button", { id: "export-json" }, "Export JSON");
    exportBtn.addEventListener("click", async () => {
      const json = await exportJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jobfill-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    const importBtn = el("button", { id: "import-json", class: "ghost" }, "Import JSON");
    const importFile = el("input", { id: "import-file", type: "file", accept: ".json" }) as HTMLInputElement;
    importFile.style.display = "none";
    const importStatus = el("span", { class: "import-status" });
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        await importJson(text);
        window.location.reload();
      } catch (err) {
        importStatus.textContent = `Import failed: ${(err as Error).message}`;
        importStatus.classList.add("error");
      }
    });
    root.appendChild(el("div", { class: "footer" }, exportBtn, importBtn, importFile, importStatus));

    // Iframe opt-in: jobfill normally only runs in top frames. Some ATSes
    // (older Workday flows, custom-vendor portals) host the application form
    // in an iframe. Adding the iframe's hostname here lets jobfill scan inside it.
    root.appendChild(renderIframeDomains(settings));
  };
  draw();
}

function renderIframeDomains(settings: Settings): HTMLElement {
  const wrap = el("div", { class: "iframe-domains" });
  wrap.appendChild(el("h3", {}, "Iframe opt-in"));
  wrap.appendChild(el("p", { class: "hint" },
    "Hostnames where jobfill should also run inside iframes. Leave empty to keep the default top-frame-only behavior."));

  const list = el("ul", { class: "iframe-list" });
  const status = el("span", { class: "import-status" });

  const draw = (): void => {
    while (list.firstChild) list.removeChild(list.firstChild);
    if (settings.iframe_domains.length === 0) {
      list.appendChild(el("li", { class: "empty" }, "(none)"));
    }
    settings.iframe_domains.forEach((d, i) => {
      const li = el("li");
      li.appendChild(el("code", {}, d));
      const rm = el("button", { class: "ghost" }, "×");
      rm.addEventListener("click", async () => {
        settings.iframe_domains.splice(i, 1);
        await saveSettings(settings);
        draw();
      });
      li.appendChild(rm);
      list.appendChild(li);
    });
  };
  draw();

  const input = el("input", { type: "text", placeholder: "e.g. apply.workable.com" }) as HTMLInputElement;
  const addBtn = el("button", {}, "Add");
  const submit = async (): Promise<void> => {
    const v = input.value.trim().toLowerCase();
    if (!v) return;
    if (settings.iframe_domains.includes(v)) {
      flashStatus(status, "Already added");
      return;
    }
    settings.iframe_domains.push(v);
    await saveSettings(settings);
    input.value = "";
    draw();
    flashStatus(status, "Added");
  };
  addBtn.addEventListener("click", submit);
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") submit(); });

  wrap.appendChild(list);
  wrap.appendChild(el("div", { class: "iframe-add" }, input, addBtn, status));
  return wrap;
}

function describeFill(m: Mapping): string {
  const f = m.fills_with;
  if (f.kind === "profile_path") return f.path;
  if (f.kind === "snippet_id")   return `snippet:${f.id || "picker"}`;
  if (f.kind === "literal")      return `"${f.value}"`;
  return "skip";
}

init();
