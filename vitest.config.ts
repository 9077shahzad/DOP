import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // Unit tests run everywhere; the integration suites talk to the real
    // backend and skip themselves when the service credentials are absent.
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // The integration suites race the same rows on purpose — never in parallel.
    fileParallelism: false,
  },
});
