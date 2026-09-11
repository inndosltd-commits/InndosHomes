import { defineConfig } from "@playwright/test";

const baseURL = process.env.CMS_E2E_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium",
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: process.env.CMS_E2E_BASE_URL
    ? undefined
    : {
        command: "PORT=4173 pnpm --filter @workspace/inndos run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});