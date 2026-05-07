import { test } from "@playwright/test";
import { join } from "node:path";

const BASE = process.env.TH_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "screenshots/transform-hub";

test("auth screen", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/today`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT_DIR, "00-auth.png"), fullPage: false });
  console.log("auth url:", page.url());
  await context.close();
});
