import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromium = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((path) => existsSync(path));

const baseURL = "http://localhost:3100";
const demoServerEnv = {
  NEXT_PUBLIC_PACE_DEMO_MODE: "1",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  OPENAI_API_KEY: "",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  webServer: {
    command: "npm run dev -- -p 3100",
    env: demoServerEnv,
    url: baseURL,
    reuseExistingServer: false,
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
      testIgnore: /screenshots\.spec\.ts/,
    },
    {
      // Used only for Play Store / marketing screenshot capture. The viewport
      // is overridden per-test inside e2e/screenshots.spec.ts, so the desktop
      // device profile here is just a sensible default.
      name: "screenshot",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /screenshots\.spec\.ts/,
    },
  ],
});
