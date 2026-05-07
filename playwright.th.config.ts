import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromium = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((path) => existsSync(path));

const baseURL = process.env.TH_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /th-(screenshots|debug|auth-shot)\.spec\.ts/,
  timeout: 240_000,
  use: {
    baseURL,
    trace: "off",
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
      name: "screenshot",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
