import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "8082";
const e2eBaseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: `EXPO_NO_METRO_WORKSPACE_ROOT=1 EXPO_PORT=${e2ePort} npx expo start --web --port ${e2ePort} --no-dev --minify`,
    url: e2eBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: e2eBaseURL,
    browserName: "chromium",
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] },
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    ...devices["Desktop Chrome"],
  },
});
