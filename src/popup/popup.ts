import type { Profile, PersonalInfo } from "../shared/types";
import { loadAll, saveProfile } from "../shared/storage";

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
  // Snippets and mappings tabs render in Tasks 24/25.
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

init();
