import esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("manifest.json", "dist/manifest.json");
await cp("src/popup/popup.html", "dist/popup.html").catch(() => {});
await cp("src/popup/popup.css", "dist/popup.css").catch(() => {});

const opts = {
  entryPoints: {
    background: "src/background/index.ts",
    content: "src/content/index.ts",
    popup: "src/popup/popup.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "firefox115",
  sourcemap: true,
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log("Watching…");
} else {
  await esbuild.build(opts);
}
