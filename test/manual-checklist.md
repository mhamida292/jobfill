# Manual smoke checklist

Run before each AMO submission. Use a clean Firefox profile via `npm run run:firefox`.

## Setup
- [ ] Build succeeds (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Extension loads with no errors in `about:debugging` → Inspect

## Profile editor
- [ ] Fill personal info, save, reload popup — values persist
- [ ] Add a work-history entry, save, reload — persists
- [ ] Add an education entry, save, reload — persists

## Fill flow — Greenhouse
- [ ] Open a public Greenhouse application page
- [ ] Press Ctrl+Shift+J
- [ ] Overlay shows ≥4 fields filled (first/last/email/phone)
- [ ] Each filled value matches profile
- [ ] [Undo all] reverts text fields
- [ ] Skipped fields are listed with reason

## Fill flow — Lever
- [ ] Open a public Lever application page
- [ ] Press Ctrl+Shift+J
- [ ] Name, email, phone, LinkedIn fill correctly

## Fill flow — Workday
- [ ] Open a public Workday application page
- [ ] Press Ctrl+Shift+J
- [ ] First/last/email fill (Workday packs are looser; partial match acceptable)

## Snippet flow
- [ ] Add a snippet with label "Why this company (test)" and `{{company}}` in body
- [ ] On a Greenhouse form, focus the "Why are you interested?" textarea, press Ctrl+Shift+K
- [ ] Picker appears, snippet listed first
- [ ] Enter inserts the snippet with `{{company}}` resolved from URL/title
- [ ] Filter input narrows the list

## Teach mode
- [ ] On any unmatched field, Ctrl-click — teach panel appears
- [ ] Select a profile path, save
- [ ] Reload page, press Ctrl+Shift+J — that field now fills with `[hi]` confidence

## Mappings management
- [ ] Popup → Mappings tab — taught mapping appears under domain
- [ ] Delete the mapping — confirms removed
- [ ] Export JSON — file downloads, opens in editor
- [ ] Import JSON — round-trip works (delete a snippet, re-import, snippet returns)

## Edge cases
- [ ] Form with no matchable fields — overlay says "filled 0, skipped N", no errors
- [ ] Page with file inputs — overlay reports them as skipped with file-input reason
- [ ] Pressing fill twice in a row doesn't double-insert
- [ ] Site iframes (e.g. Workday) — works on the top-level form fields at minimum
