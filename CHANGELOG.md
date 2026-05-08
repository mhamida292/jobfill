# Changelog

## v0.1.1 (2026-05-07)

Closes the v0.1.0 backlog: most user-visible bugs, ATS coverage gaps, and a round of polish.

### Functional fixes

- **Hotkeys no longer collide with Firefox built-ins.** Defaults moved from `Ctrl+Shift+J/K` (which silently lose to Firefox's Browser Console / Web Console) to `Ctrl+Alt+J/K`. Existing users who installed v0.1.0 keep their old bindings — remap via `about:addons` → gear → Manage Extension Shortcuts.
- **Work-history form now has all fields.** `description`, `location`, and `current` are editable in the popup. Marking a job "current" disables the end-date input.
- **Job-description textareas auto-fill.** "Describe your role", "Responsibilities", and "Job description" labels now route to `work_history.0.description`.
- **Workday matching is much better.** Scanner walks ancestor chain (capped depth) so question labels nested 2-3 levels deep resolve correctly. Workday's stable `data-automation-id` attribute is now read into `FieldSignature` and matched against `formField-firstName`, `formField-gender`, etc.
- **File inputs surfaced as manual fills.** No longer silently skipped; appear in the post-fill overlay and get a brief outlined highlight on the page.
- **Multi-checkbox demographic groups fill correctly.** Race/ethnicity/gender questions rendered as 6-8 separate `<input type="checkbox">` elements now tick the matching option only, leaving siblings unchecked.
- **`importJson` validates schema.** Malformed exports are rejected with a clear error instead of silently corrupting storage.

### Polish

- `aria-labelledby` with multiple IDs concatenates each referenced element's text.
- Wrapping `<label>` text strip is DOM-aware (iterates child nodes excluding the input) instead of a brittle string replace.
- Custom `cssEscape` replaced with native `CSS.escape` in scanner + filler.
- `extractPageVars` strips trailing ` | section`, ` - section`, ` · section` from page titles. `localhost` and IP literals no longer produce empty `{{company}}`.
- `requires_sponsorship` token-fuzzy match has a negation guard so "I will require sponsorship" can't accidentally match "I will not require sponsorship".
- Greenhouse pack rules normalized to `/i` for resilience against custom mixed-case questions.
- `personal.race` synonym table added (Black/African American, White/Caucasian, Hispanic/Latino, etc.).

### Architecture / maintenance

- All UI rendering (overlay, teach mode, snippet picker, popup) refactored from `innerHTML = templateString` to `createElement` + `textContent`. Removes the `escapeHtml`/`escapeAttr` dance and clears AMO linter warnings.
- Post-fill overlay can be minimized to a small badge in the bottom-right; pauses auto-close while you're hovering it.
- `addMapping` deduplicates: re-teaching the same field replaces the existing mapping rather than appending a duplicate.
- `loadAll` does deep safe-merge per top-level key, so additive schema changes (e.g. the new `iframe_domains` setting) backfill on read.
- **Snippet body preview** in the popup: a Preview button under each snippet renders interpolated `{{company}}` / `{{role}}` against fake placeholders, with unresolved vars highlighted in yellow.
- **Iframe support behind per-domain opt-in.** Some ATSes host the application form in an iframe. The Mappings tab now has an "Iframe opt-in" section to whitelist hostnames; iframes on other sites are still skipped to avoid running the script in analytics/ad iframes everywhere.
- **GitHub Actions CI** runs typecheck + tests + build on every push to master and on PRs.

### Test coverage

- Storage façade: `removeMapping` (both branches), `addMapping` deduplication, `importJson` validation, safe-merge on `loadAll`.
- Scanner: file inputs, `data-automation-id`, `aria-labelledby` multi-ID, DOM-aware label strip, ancestor walk for Workday-style nesting, fieldset/role=group `group_label` capture.
- Filler: file-input rejection, checkbox group fill (race/gender), single-checkbox truthy fallback.
- Synonyms: requires_sponsorship negation guard (both polarities), race option matching.
- Heuristics: description-textarea routing, group_label fallback for checkboxes, Workday `data_automation_id` matching.
- Greenhouse pack: mixed-case field names.
- Page vars: title-suffix stripping (`|`, `-`, `·`), localhost fallback.

89 → 98 unit/fixture tests.

## v0.1.0

Initial release. Firefox WebExtension (MV3) with profile auto-fill, ATS packs (Greenhouse, Lever, Workday, Ashby, iCIMS), generic heuristics, snippet picker with deterministic ranking, and teach mode for per-domain learned mappings.
