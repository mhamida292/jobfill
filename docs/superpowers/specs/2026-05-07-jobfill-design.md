# jobfill — Design Spec

**Date:** 2026-05-07
**Status:** Approved by user; ready for implementation planning
**Author:** Mohamed (with Claude)

## Problem

Filling out the same personal information, work history, and short-answer responses on every job application is a tax on time and attention. Existing solutions are either heavyweight SaaS products with subscriptions and tracking, or single-site shortcuts (LinkedIn Easy Apply) that don't generalize. The user applies through a mix of major ATS platforms (Workday, Greenhouse, Lever), aggregators (LinkedIn, Indeed), and bespoke company career pages — so the solution must generalize across arbitrary forms.

## Goals

- Auto-fill personal info, work history, and education on any application form via a keyboard shortcut.
- Reuse pre-written answer snippets ("Why this company?", "Tell me about yourself") via a deterministic picker — no AI generation.
- Learn from the user when fields don't auto-fill, so coverage improves with use.
- Keep all data local; no servers, no telemetry, no syncing.
- Run in Firefox.

## Non-goals

- AI-generated answers (snippet library only).
- Submitting applications automatically (the user reviews and clicks submit).
- Cross-machine sync (JSON export/import is the backup story).
- Chrome support in v1 (the WebExtension code will be Chrome-compatible via `webextension-polyfill` if added later, but Firefox is the only target).

## Constraints (acknowledged limitations)

- **File uploads cannot be auto-filled.** Browser security prevents extensions from setting `<input type="file">` programmatically. The extension highlights the right input and shows a hint; the user picks the file via the OS dialog. One click per file, unavoidable.
- **Account creation cannot be fully automated.** Email confirmation links and CAPTCHAs require human action. Signup forms themselves can be auto-filled.

## Architecture

A Firefox WebExtension (Manifest V3) with four pieces:

1. **Background script** — registered as an event page (Firefox MV3 permits non-service-worker backgrounds). Owns the global hotkey via the `commands` API. Holds profile, snippets, and learned mappings in `browser.storage.local`. Brokers messages between the popup and content scripts.
2. **Content script** — injected into every page. On hotkey, scans the DOM for fillable fields, runs the matching cascade, fills what it can, and shows an inline overlay summarizing results.
3. **Popup UI** — toolbar icon opens a small panel for editing profile, managing snippets, and reviewing per-domain learned mappings.
4. **Teach-mode overlay** — Ctrl-click on a field shows a contextual menu to label it; the labeling is saved as a learned mapping for that domain.

Code uses the `browser.*` Promise API (native in Firefox).

**Storage:** `browser.storage.local` only. JSON export/import for backup.

**Distribution:** AMO unlisted submission for a permanently signed XPI. Listing is optional. Source remains private.

## Data model

Five top-level keys in `browser.storage.local`:

```json
{
  "profile": {
    "personal": {
      "first_name": "...", "last_name": "...", "email": "...",
      "phone": "...", "address_line1": "...", "city": "...",
      "state": "...", "postal_code": "...", "country": "...",
      "linkedin_url": "...", "github_url": "...", "portfolio_url": "...",
      "work_authorization": "us_citizen", "requires_sponsorship": false,
      "gender": "...", "race": "...", "veteran_status": "...", "disability_status": "..."
    },
    "work_history": [
      { "company": "...", "title": "...", "start_date": "2023-01",
        "end_date": "2025-04", "current": false, "location": "...",
        "description": "..." }
    ],
    "education": [
      { "school": "...", "degree": "...", "field": "...",
        "start_date": "...", "end_date": "...", "gpa": "..." }
    ]
  },
  "snippets": [
    { "id": "uuid", "label": "Why this company (generic)",
      "body": "...", "tags": ["why-company", "generic"] }
  ],
  "mappings": {
    "boards.greenhouse.io": [
      { "field_signature": { "label": "Phone", "name": "phone", "id": "applicant_phone" },
        "fills_with": { "kind": "profile_path", "path": "personal.phone" },
        "scope": "domain" }
    ]
  },
  "settings": { "hotkey": "Ctrl+Shift+J", "auto_open_overlay": true },
  "meta": { "schema_version": 1, "exported_at": null }
}
```

**Field signatures are multi-key.** When matching on a future visit, the matcher tries `id` first (most stable), falls back to `name`, then to `label` text. If none resolve, the field is treated as new.

**`fills_with` is a tagged union.** Initial kinds:

- `profile_path` — dotted path into `profile`, e.g. `personal.email`.
- `snippet_id` — UUID of a saved snippet.
- `literal` — free text typed in teach mode (e.g. "Yes" for a Y/N dropdown).

**Demographic fields** (gender/race/veteran/disability) are stored in the schema because most US applications ask. Any field left blank is skipped by the matcher.

## Field matching cascade

When the hotkey fires, the content script enumerates `<input>`, `<textarea>`, `<select>`, and `[contenteditable]` elements. For each, it builds a field signature and tries three matchers in order; first hit wins:

```
1. Learned mapping  (this domain's stored mappings, user-confirmed)
2. ATS pattern pack (bundled rules for Greenhouse/Lever/Workday/iCIMS/Ashby)
3. Generic heuristic (regex over label / name / id / placeholder)
```

No hit → field is skipped and reported in the post-fill overlay.

### Field signature

```ts
{
  label:       string  // associated <label for=...>, aria-label, or nearest preceding text
  name:        string  // input.name
  id:          string  // input.id
  placeholder: string
  type:        "text" | "email" | "tel" | "select" | "textarea" | "radio" | "checkbox" | ...
}
```

### Generic heuristics

A single rules table of `{ regex, target, confidence, also_matches_against }` rows, e.g.:

```
/email/i              → personal.email          [name, id, label]
/phone|tel/i          → personal.phone          [name, id, label]
/first[\s_-]?name/i   → personal.first_name     [name, id, label]
/linkedin/i           → personal.linkedin_url   [name, id, label]
/cover[\s_-]?letter/i → snippet picker (tag=cover-letter)
```

Each rule's regex runs against label, name, id, placeholder in declared order; first hit wins.

### ATS pattern packs

Domain-scoped rule sets, mostly selector-based since structure is known:

```ts
{
  domain: "*.greenhouse.io",
  rules: [
    { selector: "#first_name", target: "personal.first_name" },
    { selector: "#last_name",  target: "personal.last_name"  },
    // ...
  ]
}
```

Seed packs in v1: Greenhouse, Lever, Workday, iCIMS, Ashby.

### Value mapping for selects, radios, and checkboxes

A matcher tells you *which* field to fill; it doesn't tell you *what option* to pick when the field is a `<select>`, radio group, or checkbox group. The profile may hold `work_authorization: "us_citizen"` while the form's options are `["U.S. Citizen", "Permanent Resident", "Other"]`.

Resolution order for non-text fields:

1. **Exact match** — option `value` attribute equals the profile value (`"us_citizen"`).
2. **Synonym table** — bundled synonym map per profile field, e.g. `work_authorization.us_citizen → ["U.S. Citizen", "US Citizen", "Citizen of the United States"]`. Match against option text.
3. **Fuzzy contains** — case-insensitive substring on option text (last resort, low-confidence).

If none resolve, the field is reported as skipped with reason "could not map value to options". Teach mode lets the user save a `literal` mapping pinning the exact option text for that domain.

### Confidence tiers

Every fill is tagged:

- `high` — learned mapping (user confirmed this once already).
- `medium` — ATS pattern pack hit, or exact/synonym match for select/radio/checkbox.
- `low` — generic heuristic hit, or fuzzy-contains option match.

Reported in the overlay so the user can audit at a glance.

### Open-ended fields

When the matcher hits a textarea whose label/preceding text contains snippet keywords (*why*, *describe*, *tell us*, *cover letter*, *experience with*, *interest in*), it does **not** auto-fill. It opens the snippet picker on that field instead.

## Snippet picker

Triggered automatically for "needs snippet" fields, or manually on any focused textarea via a secondary hotkey (`Ctrl+Shift+K` default).

```
┌─────────────────────────────────────────────────┐
│  Search: why_______________________________  ×  │
├─────────────────────────────────────────────────┤
│ ▶ Why this company (SaaS)        [why-company] │
│   Why this role (backend SWE)    [why-role,…]  │
│   Tell me about yourself         [intro]       │
│   Greatest weakness              [behavioral]  │
└─────────────────────────────────────────────────┘
   ↑/↓ to move · Enter to insert · Esc to cancel
```

### Ranking (deterministic)

1. Tag overlap with the field's classified tags (matcher emits tags like `why-company`, `cover-letter`, `behavioral` based on question keywords).
2. Token overlap between question text (label + nearby placeholder/help text) and snippet body — bag-of-words intersection, weighted toward rare tokens.
3. Recently used as tiebreaker.

The user can type to filter by label/tag/body substring.

### Insert behavior

- Default: replace whatever's currently in the field.
- If non-empty: insert at cursor and offer one-tap undo from the overlay.
- Variable interpolation in snippet bodies: `{{company}}`, `{{role}}`. Filled from page metadata when possible (page title, H1, URL host, ATS metadata). Any unresolved `{{var}}` is highlighted yellow in the inserted text so the user fixes it before submit.

## Teach mode and post-fill overlay

### Post-fill overlay

Appears for ~6 seconds after every hotkey-fill. Dismissible.

```
┌─ jobfill ─────────────────────────────── × ┐
│ Filled 14 fields, skipped 3                │
│                                            │
│ ✓ first_name      → "Mohamed"        [hi]  │
│ ✓ phone           → "+1 555 …"       [med] │
│ ✓ linkedin        → "linkedin.com/…" [low] │
│ ⊘ greenhouse_q_42 → skipped (no match)     │
│ ⊘ resume          → file input (manual)    │
│                                            │
│ [Undo all]  [Teach skipped]  [Close]       │
└────────────────────────────────────────────┘
```

- `[hi/med/low]` reflects cascade tier from the matcher.
- `[Undo all]` restores prior values from a snapshot taken before fill.
- `[Teach skipped]` scrolls to the first skipped field and opens teach mode.

### Teach mode

Triggered by Ctrl-click on any field, or via [Teach skipped]:

```
┌─ This field is… ─────────────────┐
│ ○ Personal info       ▾          │  → submenu: name, email, phone, …
│ ○ Work history (#0)   ▾          │  → submenu: company, title, dates, …
│ ○ Education (#0)      ▾          │  → submenu: school, degree, …
│ ○ Snippet             ▾          │  → submenu: snippet labels
│ ○ Literal text        [____]     │  e.g. "Yes" for a Y/N dropdown
│ ○ Skip on this domain            │  never auto-fill this field again
│                                  │
│ ☐ Apply to all forms on greenhouse.io  │
│                                  │
│   [Save]    [Cancel]             │
└──────────────────────────────────┘
```

Saved record:

```json
{
  "field_signature": { "label": "Phone", "name": "phone", "id": "applicant_phone" },
  "fills_with": { "kind": "profile_path", "path": "personal.phone" },
  "scope": "domain"
}
```

Stored under `mappings["<domain>"]`. On future visits, signature match (id → name → label) yields a `high` confidence fill.

The "skip on this domain" option matters for honeypots and fields the user wants to fill manually every time (e.g. salary expectations).

### Mapping management

The popup UI lists learned mappings per domain. Each row is deletable. Includes "Export learned mappings" for separate backup of training data.

## Tech stack and repo layout

**Stack:**

- **TypeScript** + **esbuild** for bundling. TypeScript catches cross-message-boundary shape errors.
- **Plain HTML/CSS** for popup and injected overlays. No framework.
- **`web-ext`** for `web-ext run` (auto-reload during development) and `web-ext sign` (AMO unlisted XPI).

**Layout:**

```
src/
  background/index.ts          ← hotkey, message broker, storage façade
  content/
    index.ts                   ← orchestrator: scan → match → fill → overlay
    scanner.ts                 ← DOM walk + signature builder
    matchers/
      learned.ts               ← per-domain mappings lookup
      ats-packs/
        greenhouse.ts
        lever.ts
        workday.ts
        ashby.ts
        icims.ts
      heuristics.ts            ← regex rules table
    overlay.ts                 ← post-fill summary UI
    teach-mode.ts              ← Ctrl-click handler + submenu
    snippet-picker.ts
  popup/
    popup.html / .css / .ts    ← profile, snippets, mappings management
  shared/
    types.ts                   ← Profile, Snippet, Mapping, FieldSignature
    storage.ts                 ← typed wrapper over browser.storage.local
    interpolate.ts             ← {{company}}/{{role}} expansion
manifest.json
test/
  fixtures/                    ← saved real-world HTML
  matchers/*.test.ts
  picker.test.ts
  interpolate.test.ts
```

## Testing strategy

Three tiers:

1. **Unit tests** (vitest + happy-dom): heuristic regex matchers, snippet ranking, `{{var}}` interpolation, signature building. Pure-function, fast, deterministic.
2. **Fixture tests** (load-bearing): saved HTML files of real ATS pages (Greenhouse demo, Lever demo, sample Workday). Each test asserts "given this DOM, the matcher fills these N fields with these values." This is the regression net for ATS pack changes.
3. **Manual smoke tests**: `web-ext run` against 3–4 real applications before each release. Documented in `test/manual-checklist.md`.

No CI initially. `npm test` runs tiers 1–2 before each AMO submission.

## Open questions / future work

- Chrome support: deferred. Adding `webextension-polyfill` and a second build target is straightforward when needed.
- Multi-profile support: deferred. Schema is single-profile in v1; can add a `profiles[]` array with an active-profile pointer later.
- AI-assisted snippet rewriting: deferred (and may never be added per current preference).
- ATS pack auto-update mechanism: out of scope for v1. New ATS packs are released as new extension versions.
