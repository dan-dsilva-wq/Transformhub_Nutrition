import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "screenshots/transform-hub";
const BASE = process.env.TH_BASE_URL ?? "http://localhost:3000";

const todayIso = new Date().toISOString().slice(0, 10);
const seededState = {
  hasOnboarded: true,
  dayKey: todayIso,
  waterMl: 1450,
  steps: 6200,
  meals: [
    {
      id: "m-1",
      name: "Greek yogurt + berries",
      calories: 320,
      proteinG: 22,
      carbsG: 38,
      fatG: 6,
      fiberG: 5,
      loggedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "m-2",
      name: "Chicken caesar wrap",
      calories: 540,
      proteinG: 36,
      carbsG: 48,
      fatG: 18,
      fiberG: 4,
      loggedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ],
  weights: [
    { isoDate: new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10), weightKg: 84.6 },
    { isoDate: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), weightKg: 83.4 },
    { isoDate: new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10), weightKg: 82.8 },
  ],
  onboardingExtras: {
    name: "Alex",
    dietaryPreferences: [],
    commitments: { steps: true, water: true, nutrition: true },
    hasSeenTour: true,
  },
};

async function shoot(page: Page, slug: string) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, `${slug}.png`), fullPage: false });
  console.log(`[shot] ${slug} ← ${page.url()}`);
}

test("Transform Hub · phone screenshots of every screen", async ({ browser }) => {
  mkdirSync(OUT_DIR, { recursive: true });

  /* ─────── Logged-in app ─────── */
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [
            { name: "pace.state.v2:demo", value: JSON.stringify(seededState) },
            { name: "pace.onboarding.step.v1", value: "0" },
          ],
        },
      ],
    },
  });

  const page = await context.newPage();
  await page.goto(`${BASE}/today`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="today-header"]', { timeout: 30000 });
  await shoot(page, "02-today");

  // Bottom nav routes — SPA navigation, no AuthGate redirect race.
  await page.locator('a[href="/log"]').first().click();
  await page.waitForURL("**/log");
  await shoot(page, "03-log");

  await page.locator('a[href="/progress"]').first().click();
  await page.waitForURL("**/progress");
  await shoot(page, "04-progress");

  await page.locator('a[href="/you/coach"]').first().click();
  await page.waitForURL("**/you/coach");
  await shoot(page, "06-coach");

  await page.locator('a[href="/you/foods"]').first().click();
  await page.waitForURL("**/you/foods");
  await shoot(page, "07-foods");

  // Drawer routes — open drawer, click link, drawer auto-closes.
  async function backToToday() {
    await page.locator('a[href="/today"]').first().click();
    await page.waitForURL("**/today");
    await page.waitForTimeout(400);
  }
  async function viaDrawer(href: string, slug: string) {
    await page.locator('button[data-tour="drawer-trigger"]').click();
    await page.waitForTimeout(400);
    await page.locator(`aside a[href="${href}"]`).click();
    await page.waitForURL(`**${href}`);
    await shoot(page, slug);
  }

  await backToToday();
  await viaDrawer("/you/plan", "05-plan");
  await backToToday();
  await viaDrawer("/you/workouts", "08-workouts");
  await backToToday();
  await viaDrawer("/you/reminders", "09-reminders");
  await backToToday();
  await viaDrawer("/you/integrations", "10-integrations");
  await backToToday();
  await viaDrawer("/you/settings", "11-settings");

  // Drawer open — premium dark drawer over today
  await backToToday();
  await page.locator('button[data-tour="drawer-trigger"]').click();
  await page.waitForTimeout(700);
  await shoot(page, "12-drawer");

  await context.close();

  /* ─────── Auth screen — Supabase configured, no session ─────── */
  const authContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const authPage = await authContext.newPage();
  await authPage.goto(`${BASE}/today`, { waitUntil: "domcontentloaded" });
  await authPage.waitForLoadState("networkidle").catch(() => undefined);
  await authPage.waitForTimeout(2500);
  await authPage.screenshot({ path: join(OUT_DIR, "00-auth.png"), fullPage: false });
  console.log(`[shot] 00-auth ← ${authPage.url()}`);
  await authContext.close();

  /* ─────── Onboarding — clean state, hasOnboarded=false ─────── */
  const onbContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [
            {
              name: "pace.state.v2:demo",
              value: JSON.stringify({ ...seededState, hasOnboarded: false }),
            },
            { name: "pace.onboarding.step.v1", value: "0" },
          ],
        },
      ],
    },
  });
  const onbPage = await onbContext.newPage();
  await onbPage.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await onbPage.waitForLoadState("networkidle").catch(() => undefined);
  await onbPage.waitForTimeout(2500);
  await onbPage.screenshot({ path: join(OUT_DIR, "01-onboarding-welcome.png"), fullPage: false });
  console.log(`[shot] 01-onboarding-welcome ← ${onbPage.url()}`);

  // Walk a couple of onboarding steps for visual proof
  await onbPage.evaluate(() => {
    localStorage.setItem("pace.onboarding.step.v1", "9"); // PlanReveal
  });
  await onbPage.reload({ waitUntil: "domcontentloaded" });
  await onbPage.waitForLoadState("networkidle").catch(() => undefined);
  await onbPage.waitForTimeout(2500);
  await onbPage.screenshot({ path: join(OUT_DIR, "13-plan-reveal.png"), fullPage: false });

  await onbPage.evaluate(() => {
    localStorage.setItem("pace.onboarding.step.v1", "10"); // HabitPillars
  });
  await onbPage.reload({ waitUntil: "domcontentloaded" });
  await onbPage.waitForLoadState("networkidle").catch(() => undefined);
  await onbPage.waitForTimeout(2500);
  await onbPage.screenshot({ path: join(OUT_DIR, "14-habit-pillars.png"), fullPage: false });

  await onbPage.evaluate(() => {
    localStorage.setItem("pace.onboarding.step.v1", "12"); // TrialOffer
  });
  await onbPage.reload({ waitUntil: "domcontentloaded" });
  await onbPage.waitForLoadState("networkidle").catch(() => undefined);
  await onbPage.waitForTimeout(2500);
  await onbPage.screenshot({ path: join(OUT_DIR, "15-trial-offer.png"), fullPage: false });

  await onbContext.close();
});
