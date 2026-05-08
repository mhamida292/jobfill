# Building jobfill from source

This is the build-reproduction guide AMO reviewers need to verify the bundled
`content.js`, `popup.js`, and `background.js` shipped in the submitted XPI.

## Prerequisites

- **Node.js** ≥ 20 (tested with Node 20 LTS in CI; built locally with Node 25.8)
- **npm** ≥ 10 (ships with Node 20+)

No other system tools required. Builds have been verified on:

- Windows 11 (PowerShell)
- Ubuntu 22.04 (the GitHub Actions runner — see `.github/workflows/ci.yml`)

## Reproduce the build

From the repository root:

```sh
npm ci          # install pinned deps from package-lock.json
npm run build   # bundle src/ → dist/ via esbuild
```

`npm run build` runs `node esbuild.config.mjs` (no other args). The script:

1. Wipes and recreates `dist/`.
2. Copies `manifest.json`, `src/icon.svg`, `src/popup/popup.html`, and `src/popup/popup.css` into `dist/`.
3. Bundles three TypeScript entry points with esbuild:
   - `src/background/index.ts` → `dist/background.js`
   - `src/content/index.ts`    → `dist/content.js`
   - `src/popup/popup.ts`      → `dist/popup.js`

   Build options (see `esbuild.config.mjs`): `bundle: true`, `format: "iife"`,
   `target: "firefox115"`, `sourcemap: true`. No minification, no obfuscation.

The `dist/` produced this way matches the contents of the submitted XPI byte-for-byte
(the XPI is just `dist/` zipped via `npx web-ext build --source-dir=dist`, which
the `npm run package` script wraps).

## Verify the bundle

```sh
npm run typecheck   # tsc --noEmit
npm test            # vitest run — 98 unit + fixture tests
```

CI (`.github/workflows/ci.yml`) runs the same three commands on every push.

## Source map

`esbuild` emits inline source maps (`*.js.map` next to each bundle in `dist/`).
Reviewers can match any line in `dist/content.js` back to the original
TypeScript file in `src/`.

## What's inside

- `src/background/`      — MV3 event-page script: hotkey listener, message broker
- `src/content/`         — content script: scanner, matchers, filler, overlay, teach mode, snippet picker
- `src/popup/`           — toolbar popup UI (HTML/CSS/TS, no framework)
- `src/shared/`          — types, storage façade, synonym tables, snippet interpolation
- `test/unit/`           — vitest unit tests
- `test/fixture/`        — fixture tests against saved real-world ATS HTML

No remote scripts, no analytics, no telemetry. All data stays in
`browser.storage.local` on the user's machine.
