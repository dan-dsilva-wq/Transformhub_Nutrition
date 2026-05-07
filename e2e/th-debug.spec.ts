import { test } from "@playwright/test";

const BASE = process.env.TH_BASE_URL ?? "http://localhost:3000";
const seededState = {
  hasOnboarded: true,
  dayKey: new Date().toISOString().slice(0, 10),
  onboardingExtras: {
    name: "Alex",
    dietaryPreferences: [],
    commitments: { steps: true, water: true, nutrition: true },
    hasSeenTour: true,
  },
};

test("debug /log redirect", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [{ name: "pace.state.v2:demo", value: JSON.stringify(seededState) }],
        },
      ],
    },
  });
  const page = await context.newPage();

  page.on("framenavigated", (f) => console.log("[nav]", f.url()));
  page.on("console", (m) => console.log("[browser]", m.type(), m.text()));

  await page.goto(`${BASE}/log`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const url = page.url();
  const ls = await page.evaluate(() => {
    const out: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      out[k] = localStorage.getItem(k);
    }
    return out;
  });
  console.log("FINAL URL:", url);
  console.log("LOCALSTORAGE KEYS:", Object.keys(ls));

  await context.close();
});
