import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir(".sites-runtime", { recursive: true });
// Server-markup unit tests: routing is stubbed, not a browser/navigation test.
await build({
  entryPoints: ["tests/phase3-render.test.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: ".sites-runtime/phase3-render-tests.mjs",
  plugins: [
    {
      name: "router-test-boundary",
      setup(build) {
        build.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "router-test",
        }));
        build.onLoad({ filter: /.*/, namespace: "router-test" }, (args) => ({
          contents:
            args.path === "next/link"
              ? 'import { createElement } from "react"; export default function Link(props) { return createElement("a", props); }'
              : "export const useRouter=()=>({push(){},replace(){}}); export const useSearchParams=()=>new URLSearchParams();",
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  ["--test", ".sites-runtime/phase3-render-tests.mjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
