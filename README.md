# jobfill

A Firefox extension that auto-fills job application forms with your saved profile.

## Install (development)

1. `npm install`
2. `npm run build`
3. `npm run run:firefox` — launches Firefox with the extension loaded.

## Install (permanent, signed XPI)

1. `npm run build`
2. `npm run sign` — submits to AMO unlisted, returns a signed `.xpi` in `web-ext-artifacts/`.
3. In Firefox: `about:addons` → gear icon → Install Add-on From File → pick the XPI.

## Usage

1. Click the toolbar icon to open the popup. Fill in the **Profile** tab and click Save.
2. Add reusable **Snippets** for "Why this company?", cover letter, etc. Use `{{company}}` and `{{role}}` for interpolation.
3. On any application form: press **Ctrl+Shift+J** to fill.
4. On any open-ended textarea: press **Ctrl+Shift+K** to open the snippet picker.
5. If a field is filled wrong or skipped: **Ctrl-click** it to label it. The mapping is saved per-domain.

## File uploads

Cannot be auto-filled (browser security). The overlay flags them; you pick the file via the OS dialog.

## Commands

- `npm run build` — production build.
- `npm run watch` — incremental rebuild.
- `npm test` — unit + fixture tests.
- `npm run typecheck` — TypeScript without emit.
- `npm run run:firefox` — dev runner.
- `npm run sign` — AMO unlisted signing.

## Architecture

See `docs/superpowers/specs/2026-05-07-jobfill-design.md`.

## License

Personal use.
