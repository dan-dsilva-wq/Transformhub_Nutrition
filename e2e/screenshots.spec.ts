import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Captures Play Store / marketing screenshots at the three viewport sizes
 * Google asks for: phone (1080x1920), 7" tablet (1200x1920), 10" tablet
 * (1600x2560). Each screen is captured at every size into screenshots/<size>/
 *
 * Run with:  npx playwright test e2e/screenshots.spec.ts --project=screenshot
 */

const OUT_DIR = "screenshots";

/**
 * Each entry's CSS viewport × deviceScaleFactor must equal the output PNG
 * dimensions Play requires. Setting a small CSS viewport with a higher DPR
 * makes the page render at mobile/tablet breakpoints (so UI fills the frame
 * like a real phone screenshot) while still producing a high-res PNG.
 *
 *   phone     360 ×  640  ×  DPR 3  →  1080 × 1920  (9:16, Play phone slot)
 *   tablet 7"  600 ×  960  ×  DPR 2  →  1200 × 1920  (9:16, Play 7" slot)
 *   tablet 10" 800 × 1280  ×  DPR 2  →  1600 × 2560  (9:16, Play 10" slot)
 */
const SIZES = [
  { name: "phone-1080x1920", width: 360, height: 640, scale: 3, isMobile: true },
  { name: "tablet-7in-1200x1920", width: 600, height: 960, scale: 2, isMobile: false },
  { name: "tablet-10in-1600x2560", width: 800, height: 1280, scale: 2, isMobile: false },
] as const;

/**
 * Each screen describes how to navigate to it from the Today screen via the
 * in-app shell (bottom nav + drawer menu). Going through real navigation
 * keeps the React tree mounted so AuthGate doesn't re-bounce to /onboarding
 * on every fresh page load.
 */
const SCREENS: Array<{
  slug: string;
  navigate: (page: Page) => Promise<void>;
}> = [
  {
    slug: "01-today",
    navigate: async () => {
      // Already there after warm-up.
    },
  },
  {
    slug: "02-log",
    navigate: async (page) => {
      await page.getByRole("link", { name: /log/i }).first().click();
    },
  },
  {
    slug: "03-progress",
    navigate: async (page) => {
      await page.getByRole("link", { name: "Progress" }).first().click();
    },
  },
  {
    slug: "04-plan",
    navigate: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: "Plan & targets" }).click();
    },
  },
  {
    slug: "05-coach",
    navigate: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: "Coach" }).click();
    },
  },
  {
    slug: "06-foods",
    navigate: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: "Food guide" }).click();
    },
  },
  {
    slug: "07-workouts",
    navigate: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: "Workouts" }).click();
    },
  },
  {
    slug: "08-settings",
    navigate: async (page) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: "Settings" }).click();
    },
  },
];

const seededState = {
  hasOnboarded: true,
  dayKey: new Date().toISOString().slice(0, 10),
  waterMl: 1450,
  steps: 6200,
  onboardingExtras: {
    dietaryPreferences: [],
    commitments: { steps: true, water: true, nutrition: true },
    hasSeenTour: true,
  },
};

for (const size of SIZES) {
  // One context (= one warm-up) per size, capturing every screen inside it via
  // soft client-side navigation. Much faster than tearing down per screen, and
  // dodges the AuthGate first-render redirect on deep links.
  test(`${size.name} · all screens`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
      isMobile: size.isMobile,
      hasTouch: true,
      storageState: {
        cookies: [],
        origins: [
          {
            origin: "http://localhost:3100",
            localStorage: [
              {
                name: "pace.state.v2:demo",
                value: JSON.stringify(seededState),
              },
            ],
          },
        ],
      },
    });

    const page = await context.newPage();

    // Warm up on Today so AuthGate sees the hydrated hasOnboarded=true and
    // the rest of the in-app navigation behaves like it would for a real user.
    await page.goto("/today?demo=1");
    await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await page.waitForTimeout(400);

    const dir = join(OUT_DIR, size.name);
    mkdirSync(dir, { recursive: true });

    for (const screen of SCREENS) {
      try {
        await screen.navigate(page);
      } catch (err) {
        // Some routes may not exist or may be reached differently  -  log and
        // skip rather than fail the whole capture run.
        console.warn(`[${size.name}] could not navigate to ${screen.slug}:`, err);
        continue;
      }
      // Wait for any nav animation / route transition.
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(500);

      await page.screenshot({
        path: join(dir, `${screen.slug}.png`),
        fullPage: false,
      });
    }

    await context.close();
  });
}
