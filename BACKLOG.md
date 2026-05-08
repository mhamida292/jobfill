# jobfill — Backlog

Improvements identified during v0.1.0 development and early use. Listed in rough priority order within each category. None of these block daily use of v0.1.0; teach mode + the existing ATS packs cover most cases.

## Functional gaps

### Hotkey defaults conflict with Firefox built-ins
`Ctrl+Shift+J` collides with Firefox's **Browser Console**; `Ctrl+Shift+K` collides with the **Web Console**. Built-in browser shortcuts override extension `commands`, so the default hotkeys never actually fire. Bump defaults to `Ctrl+Alt+J` / `Ctrl+Alt+K` for v0.1.1. Users can already remap via `about:addons` → gear → Manage Extension Shortcuts; defaults should work out of the box.

### Popup work-history form is missing fields
The `WorkExperience` data model has `description`, `location`, and `current`, but `popup.html` / `popup.ts` only renders inputs for company, title, start_date, end_date. Users can't enter job descriptions through the UI at all. Add the missing inputs.

### No matcher for "job description" textareas
No heuristic or ATS-pack rule maps form fields like "Describe your role" / "Responsibilities" / "Duties" to `work_history.0.description`. Add a heuristic that matches these patterns on textareas and pulls from the most recent work history entry.

### Workday: question labels not resolved
The scanner's label resolver only checks direct siblings + the immediate parent. Workday wraps question labels and their inputs in separate sibling `<div>`s nested 2-3 levels deep, so the actual question text gets missed and the resolver falls back to nearby text (often the option text). Walk up ancestors looking for non-input text content; cap depth to avoid grabbing unrelated text.

### Workday: missing `data-automation-id` support
Workday tags inputs with stable identifiers like `data-automation-id="formField-gender"`. The scanner doesn't read this attribute, so the Workday pack misses many fields. Add `data_automation_id` to `FieldSignature` and let the Workday pack match against it.

### File inputs invisible to the user
The scanner skips `<input type="file">` entirely (per `SKIPPED_INPUT_TYPES`). The design spec said we'd surface them in the overlay with a hint ("← upload your resume here"). Include file inputs in scan results, mark as `"manual fill"` in the overlay, optionally highlight them on the page so the user can find them quickly. Browser security still prevents auto-upload — this is just a discovery aid.

### Multi-select demographic checkboxes (race/ethnicity)
Race fields on many ATSes are 6-8 separate `<input type="checkbox">` elements (one per option, e.g., "American Indian", "Asian", "Black", ...). The current matcher treats each as a separate field with the option text as its label, none of which match any rule. Add logic: when the *parent question* is identified as a race/ethnicity field and the user's profile has a value, check only the checkbox whose label matches the user's value.

### `importJson` accepts any JSON
Currently casts the parsed object to `StorageShape` with zero validation. A malformed file silently corrupts storage. At minimum, validate `parsed.meta?.schema_version === 1` before writing. Eventually, add per-key shape checks.

### `removeMapping` has no test coverage
The only function in `storage.ts` with branching logic (load → splice → delete-key-if-empty → set), and the only one without a unit test. Add a test that exercises both the "more entries remain" and "list is now empty, delete the key" paths.

## Polish / quality

### `aria-labelledby` multi-ID parsing
Spec allows space-separated ID lists; current code passes the whole attribute value to `getElementById`, which fails on multi-ID. Split on whitespace, concatenate text from each referenced element.

### Wrapping `<label>` text strip is DOM-naive
`wrapping.textContent.replace(el.textContent ?? "", "")` is a string replace, not DOM-aware. Edge case: if the input has a value like "Jane" and the label says "Name Jane", the strip would leave "Name". Iterate child nodes excluding the input element instead.

### Replace custom `cssEscape` with native `CSS.escape`
The custom version handles only basic chars and is duplicated in `scanner.ts` and `filler.ts`. `CSS.escape` is available in browser contexts (and via happy-dom in tests), handles Unicode + leading digits, and removes the duplication.

### `innerHTML` warnings from AMO lint
All UI rendering (overlay, teach-mode, snippet picker, popup) uses `el.innerHTML = templateString`. Dynamic strings are escaped via `escapeHtml` / `escapeAttr` helpers so the actual XSS risk is low, but Mozilla's linter flags every assignment as "unsafe assignment to innerHTML". Refactor rendering to `createElement` + `textContent` for cleaner AMO submissions and a slightly better quality score.

### Page var extraction edge cases
`extractPageVars` doesn't strip trailing suffixes from page titles, so `{{company}}` can interpolate as `"Acme | Careers"` or `"Acme - Jobs"`. Strip after a trailing `|` / `-` / `·`. Also: `localhost` / single-label hosts produce empty `company`. Document or guard.

### Token-fuzzy false positive on `requires_sponsorship`
The synonym `"I will require sponsorship"` (for the `true` value) tokenizes to `["will", "require", "sponsorship"]`. A form option `"I will not require sponsorship"` shares all three tokens, so token-fuzzy could match the wrong option for users whose profile has `requires_sponsorship: true`. Practical risk is low (the synonym-substring step usually catches the right answer first), but worth either an explicit "I will not require sponsorship" synonym for the `false` value, or a "negation guard" rule.

### Greenhouse pack case-sensitivity inconsistent
Some rules use `/i`, some don't. Greenhouse field names are lowercase by convention, so it works in practice. Normalize all rules to `/i` for resilience against custom Greenhouse questions that use mixed case.

### `personal.race` has no synonym table
The field is recognized by heuristic but synonym table has no race entries. Falls through to fuzzy-contains only. Add common option-text synonyms (e.g., `"asian"` → `["Asian", "Asian / Pacific Islander"]`).

## Architecture / maintenance

### Iframe support
Content scripts only inject into the top document by default. Some ATSes (older Workday flows, some custom-vendor portals) host the actual application form in an iframe. Add `"all_frames": true` to the manifest's `content_scripts` entry — but accept the tradeoff: it runs the script in every iframe on every page (analytics, ads, embedded videos), which costs CPU and might break some sites. Worth a feature flag or per-domain opt-in.

### CI on push
No automated test running. Add a GitHub Actions workflow that runs `npm install && npm test && npm run typecheck && npm run build` on every push to `master` and on PRs.

### Automated AMO signing on tag
GitHub Action that runs `web-ext sign` when a `v*` tag is pushed, using AMO API credentials from repo secrets. Drops the `.xpi` as a release artifact.

### Snippet body preview in popup
Snippet body editing is a plain textarea. Add a "Preview" button that runs `interpolate()` against the current page vars (when the popup is opened from a job page) or against fake placeholders, so users see what `{{company}}` and `{{role}}` resolve to.

### Overlay positioning / repositionable
Overlay sits bottom-right with `position: fixed`. On long forms it overlaps with form content (visible in real Workday screenshots). Either make it draggable or add a "minimize to a small badge in the corner" mode.

### Multi-profile support
Spec called this out as deferred. Add a `profiles[]` array with an active-profile pointer when a clear use case emerges (e.g., user wants different resumes / snippet sets / work-history emphasis per role type).

### LLM-assisted field detection (opt-in)
Spec ruled this out for v0.1.0 because the user preferred no AI. Worth revisiting if teach mode + ATS packs prove insufficient. Implementation: BYO API key, sends DOM structure (labels, names, no values) to Claude or GPT, gets back a field → profile-path mapping; cached per form. The user reviews before fill.

### Mapping deduplication
`addMapping` doesn't check whether an equivalent mapping already exists for the same domain + signature. If the user teaches the same field twice (or teach-mode runs twice), duplicate entries accumulate. Detect-and-replace before push.

### Safe-merge on `loadAll`
Current `loadAll` falls back to defaults at the *top-level key* granularity (`stored.profile ?? DEFAULT_STORAGE.profile`). If a future version adds a new field to `Settings` (say `theme`), existing stored settings won't have it, and the fallback won't run because `stored.settings` is truthy. Not an issue today (frozen schema), but bump `schema_version` and migrate on additive changes.
