import { defineConfig } from "@playwright/test";

const repoRoot = "..";
const webPort = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
const adminPort = webPort + 1;
const reuseExistingServer = process.env.MOBILE_RUNTIME_TEST_PORT == null;

export default defineConfig({
  testDir: repoRoot,
  timeout: 20_000,
  use: {
    viewport: { width: 1100, height: 1100 },
  },
  projects: [
    {
      name: "web",
      testMatch: "web/tests/**/*.spec.ts",
      use: { baseURL: `http://127.0.0.1:${webPort}` },
    },
    {
      name: "admin",
      testMatch: "admin/tests/**/*.spec.ts",
      use: { baseURL: `http://127.0.0.1:${adminPort}` },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${webPort}`,
      cwd: repoRoot,
      url: `http://127.0.0.1:${webPort}/tests/runtime-fixture.html`,
      reuseExistingServer,
    },
    {
      command: `npm run dev:admin -- --port ${adminPort}`,
      cwd: repoRoot,
      url: `http://127.0.0.1:${adminPort}/`,
      reuseExistingServer,
    },
  ],
});
