import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromium = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((path) => existsSync(path));

const baseURL = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  webServer: {
    command: "npm run dev -- -p 3100",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(localChromium
      ? {
          launchOptions: {
            executablePath: localChromium,
          },
        }
      : {}),
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
