import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["tests/phase1.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: ".sites-runtime/phase1-tests.mjs",
});
const result = spawnSync(
  process.execPath,
  ["--test", ".sites-runtime/phase1-tests.mjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
