import type { Profile, PersonalInfo, Snippet } from "../shared/types";
import { loadAll, saveProfile, saveSnippets } from "../shared/storage";

const PERSONAL_FIELDS: { key: keyof PersonalInfo; type?: string }[] = [
  { key: "first_name" }, { key: "last_name" }, { key: "email", type: "email" },
  { key: "phone", type: "tel" }, { key: "address_line1" }, { key: "city" },
  { key: "state" }, { key: "postal_code" }, { key: "country" },
  { key: "linkedin_url", type: "url" }, { key: "github_url", type: "url" }, { key: "portfolio_url", type: "url" },
  { key: "work_authorization" }, { key: "gender" }, { key: "race" },
  { key: "veteran_status" }, { key: "disability_status" },
];

async function init(): Promise<void> {
  // Tabs
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
  // Mappings tab renders in Task 25.
}

function renderProfile(p: Profile): void {
  const personal = document.getElementById("personal-fields")!;
  personal.innerHTML = PERSONAL_FIELDS.map(f => `
    <label><span>${f.key}</span>
      <input data-pkey="${f.key}" type="${f.type ?? "text"}" value="${escapeAttr(String(p.personal[f.key] ?? ""))}">
    </label>
  `).join("") + `
    <label><span>requires_sponsorship</span>
      <input data-pkey="requires_sponsorship" type="checkbox" ${p.personal.requires_sponsorship ? "checked" : ""}>
    </label>
  `;

  const workList = document.getElementById("work-list")!;
  const renderWork = (): void => {
    workList.innerHTML = p.work_history.map((w, i) => `
      <div class="row">
        <input placeholder="Company" data-w="${i}" data-k="company" value="${escapeAttr(w.company)}">
        <input placeholder="Title"   data-w="${i}" data-k="title"   value="${escapeAttr(w.title)}">
        <input placeholder="YYYY-MM" data-w="${i}" data-k="start_date" value="${escapeAttr(w.start_date)}">
        <input placeholder="YYYY-MM" data-w="${i}" data-k="end_date"   value="${escapeAttr(w.end_date)}">
        <button data-action="rm-work" data-i="${i}">×</button>
      </div>
    `).join("");
    workList.querySelectorAll<HTMLButtonElement>('[data-action="rm-work"]').forEach(btn => {
      btn.addEventListener("click", () => { p.work_history.splice(Number(btn.dataset["i"]), 1); renderWork(); });
    });
  };
  renderWork();

  document.getElementById("add-work")!.addEventListener("click", () => {
    p.work_history.push({ company: "", title: "", start_date: "", end_date: "", current: false, location: "", description: "" });
    renderWork();
  });

  const eduList = document.getElementById("edu-list")!;
  const renderEdu = (): void => {
    eduList.innerHTML = p.education.map((e, i) => `
      <div class="row">
        <input placeholder="School" data-e="${i}" data-k="school" value="${escapeAttr(e.school)}">
        <input placeholder="Degree" data-e="${i}" data-k="degree" value="${escapeAttr(e.degree)}">
        <input placeholder="Field"  data-e="${i}" data-k="field"  value="${escapeAttr(e.field)}">
        <button data-action="rm-edu" data-i="${i}">×</button>
      </div>
    `).join("");
    eduList.querySelectorAll<HTMLButtonElement>('[data-action="rm-edu"]').forEach(btn => {
      btn.addEventListener("click", () => { p.education.splice(Number(btn.dataset["i"]), 1); renderEdu(); });
    });
  };
  renderEdu();

  document.getElementById("add-edu")!.addEventListener("click", () => {
    p.education.push({ school: "", degree: "", field: "", start_date: "", end_date: "", gpa: "" });
    renderEdu();
  });

  document.getElementById("save-profile")!.addEventListener("click", async () => {
    // Read personal
    document.querySelectorAll<HTMLInputElement>("[data-pkey]").forEach(input => {
      const key = input.dataset["pkey"] as keyof PersonalInfo;
      if (input.type === "checkbox") (p.personal as Record<keyof PersonalInfo, unknown>)[key] = input.checked;
      else (p.personal as Record<keyof PersonalInfo, unknown>)[key] = input.value;
    });
    // Read work history
    document.querySelectorAll<HTMLInputElement>("[data-w]").forEach(input => {
      const i = Number(input.dataset["w"]);
      const k = input.dataset["k"] as keyof Profile["work_history"][number];
      (p.work_history[i]! as unknown as Record<string, unknown>)[k] = input.value;
    });
    // Read education
    document.querySelectorAll<HTMLInputElement>("[data-e]").forEach(input => {
      const i = Number(input.dataset["e"]);
      const k = input.dataset["k"] as keyof Profile["education"][number];
      (p.education[i]! as unknown as Record<string, unknown>)[k] = input.value;
    });
    await saveProfile(p);
    document.getElementById("save-status")!.textContent = "Saved";
    setTimeout(() => { document.getElementById("save-status")!.textContent = ""; }, 1500);
  });
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]!));
}

function renderSnippets(snippets: Snippet[]): void {
  const root = document.getElementById("tab-snippets")!;
  const ensureSnippetIds = (s: Snippet[]): void => {
    for (const x of s) if (!x.id) x.id = crypto.randomUUID();
  };
  ensureSnippetIds(snippets);

  const draw = (): void => {
    root.innerHTML = `
      <h3>Snippets</h3>
      <div id="snippet-list">
        ${snippets.map((s, i) => `
          <div class="row">
            <input data-s="${i}" data-k="label" placeholder="Label" value="${escapeAttr(s.label)}" style="width:100%">
            <input data-s="${i}" data-k="tags"  placeholder="Tags (comma-separated)" value="${escapeAttr(s.tags.join(","))}" style="width:100%">
            <textarea data-s="${i}" data-k="body" placeholder="Body. Use {{company}} and {{role}} for interpolation.">${escapeAttr(s.body)}</textarea>
            <button data-action="rm-s" data-i="${i}">Delete</button>
          </div>
        `).join("")}
      </div>
      <div class="footer">
        <button id="add-s">+ Add snippet</button>
        <button id="save-s">Save</button>
        <span id="snippet-status"></span>
      </div>
    `;
    root.querySelector("#add-s")!.addEventListener("click", () => {
      snippets.push({ id: crypto.randomUUID(), label: "", body: "", tags: [] });
      draw();
    });
    root.querySelectorAll<HTMLButtonElement>('[data-action="rm-s"]').forEach(btn => {
      btn.addEventListener("click", () => { snippets.splice(Number(btn.dataset["i"]), 1); draw(); });
    });
    root.querySelector("#save-s")!.addEventListener("click", async () => {
      // Read inputs
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-s]").forEach(el => {
        const i = Number(el.dataset["s"]);
        const k = el.dataset["k"] as "label" | "tags" | "body";
        if (k === "tags") snippets[i]!.tags = el.value.split(",").map(t => t.trim()).filter(Boolean);
        else (snippets[i] as unknown as Record<string, unknown>)[k] = el.value;
      });
      await saveSnippets(snippets);
      const status = root.querySelector("#snippet-status") as HTMLElement;
      status.textContent = "Saved";
      setTimeout(() => { status.textContent = ""; }, 1500);
    });
  };
  draw();
}

init();
