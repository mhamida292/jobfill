# jobfill — Backlog

Items that remain after v0.1.1. Everything in the original v0.1.0 backlog that wasn't explicitly deferred is now shipped — see `CHANGELOG.md`.

## Deferred features (no clear use case yet)

### Multi-profile support
Spec called this out as deferred. Add a `profiles[]` array with an active-profile pointer when a clear use case emerges (e.g., user wants different resumes / snippet sets / work-history emphasis per role type). Storage `safe-merge` on `loadAll` already exists, so the migration path is in place.

### LLM-assisted field detection (opt-in)
Spec ruled this out for v0.1.0 because the user preferred no AI. Worth revisiting if teach mode + ATS packs prove insufficient. Implementation: BYO API key, sends DOM structure (labels, names, no values) to Claude or GPT, gets back a field → profile-path mapping; cached per form. The user reviews before fill.

### Chrome support
Deferred per spec. Adding `webextension-polyfill` and a second build target is straightforward when needed. Code already uses the `browser.*` Promise API; the polyfill bridges it to Chrome's callback `chrome.*`.

## Infrastructure

### Automated AMO signing on tag
GitHub Action that runs `web-ext sign` when a `v*` tag is pushed, using AMO API credentials (`AMO_JWT_ISSUER` and `AMO_JWT_SECRET`) from repo secrets. Drops the `.xpi` as a release artifact. Punted from v0.1.1 because the credentials aren't configured yet — the test/build CI workflow that landed in v0.1.1 will run unmodified once the sign job is appended.

### ATS pack auto-update mechanism
Out of scope per spec. New ATS packs ship as new extension versions. Could be revisited if pack churn becomes a release-cadence problem.

## Known smaller gaps

### Teach mode signature is shallower than the scanner's
`teach-mode.ts:signatureOf()` still pulls `label` only from `aria-label`, while `scanner.ts:findLabelText()` does the full cascade (label[for], wrapping label, aria-label, aria-labelledby multi-ID, ancestor walk, etc.). Mappings learned via Ctrl-click can have a different `label` than what the scanner produces on later fills, defeating the label-fallback path of `matchLearned`. Either share the resolver between scanner and teach mode, or drop label from the teach-mode signature entirely (id+name are usually enough for learned mappings).

### Snippet preview uses fake placeholders only
The popup runs in its own context and doesn't have access to the active tab's page vars. Live page-aware preview would need a message round-trip to the content script. Useful but not urgent — fake placeholders give the user enough signal to spot unresolved `{{vars}}`.
