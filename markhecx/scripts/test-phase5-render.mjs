import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["tests/phase5-render.test.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: ".sites-runtime/phase5-render-tests.mjs",
  plugins: [
    {
      name: "test-context",
      setup(build) {
        build.onResolve({filter: /api-resource$/}, () => ({path: "resources", namespace: "api-fixture"}));
        build.onLoad({filter: /.*/, namespace: "api-fixture"}, () => ({contents: "export const useAPIResource=path=>({data:globalThis.__resource?.(path),loading:false,retry(){}});", loader: "js"}));
        build.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "router",
        }));
        build.onLoad({ filter: /.*/, namespace: "router" }, (args) => ({
          contents:
            args.path === "next/link"
              ? 'import {createElement} from "react";export default function Link(p){return createElement("a",p);}'
              : 'export const useRouter=()=>({push(){},replace(){}});export const useSearchParams=()=>new URLSearchParams();export const usePathname=()=>"/";',
          loader: "js",
          resolveDir: process.cwd(),
        }));
        build.onResolve({ filter: /^(\.\/|\.\.\/)provider$/ }, (args) => {
          const marketplace =
            args.importer.includes("/marketplace/") &&
            args.path === "./provider";
          return {
            path: marketplace ? "marketplace" : "app",
            namespace: "context",
          };
        });
        build.onLoad({ filter: /.*/, namespace: "context" }, (args) => ({
          contents:
            args.path === "marketplace"
              ? "export const useMarketplace=()=>globalThis.__market;"
              : 'import {createElement} from "react";export const useApp=()=>globalThis.__app;export const SignInGate=()=>createElement("p",null,"Sign in to continue");',
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  ["--test", ".sites-runtime/phase5-render-tests.mjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
