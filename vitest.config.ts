import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Vitest configuration for GER4K's pure, framework-free domain tests.
 *
 * - Single-run only (`npm run test` → `vitest run`); no watch mode is wired.
 * - `environment: "node"` — the domain layer imports nothing from React/Next and
 *   needs no DOM, so the lightweight Node environment is correct and fastest.
 * - Resolves the `@/` path alias to `./src` manually (mirrors tsconfig `paths`)
 *   so domain modules that import from `@/types`, `@/data`, `@/domain/*` resolve
 *   under Vitest without pulling in an extra plugin dependency.
 */
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src");

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
