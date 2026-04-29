import { expect, test } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test("mobile onboarding, mocked meal estimate, and coach flow", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pace.state.v1",
      JSON.stringify({
        hasOnboarded: true,
        onboardingExtras: {
          commitments: { steps: false, water: false, nutrition: false },
          hasSeenTour: true,
        },
      }),
    );
  });

  await page.route("**/api/ai/meal-estimate", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        estimate: {
          summary: "Mock chicken rice bowl",
          items: [
            {
              name: "Chicken",
              portion: "1 palm",
              calories: 220,
              proteinG: 40,
              carbsG: 0,
              fatG: 5,
              fiberG: 0,
              confidence: 0.9,
            },
            {
              name: "Rice",
              portion: "1 cupped hand",
              calories: 210,
              proteinG: 4,
              carbsG: 45,
              fatG: 1,
              fiberG: 1,
              confidence: 0.8,
            },
          ],
          totals: {
            calories: 430,
            proteinG: 44,
            carbsG: 45,
            fatG: 6,
            fiberG: 1,
          },
          confidence: 0.86,
          editPrompts: ["Confirm sauce."],
          safetyNote: "Estimate only.",
        },
        model: "mock",
      }),
    });
  });

  await page.route("**/api/ai/coach", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        coach: {
          reply: "Log dinner before you eat it.",
          tone: "firm_supportive",
          suggestedActions: ["Log dinner", "Drink water"],
          checkInQuestion: "What is the next action?",
          riskFlag: "none",
        },
        model: "mock",
      }),
    });
  });

  await page.route("**/api/food/barcode?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        product: {
          code: "1234567890123",
          name: "Mock protein bar",
          brand: "Lean Test",
          servingSize: "60 g",
          calories: 210,
          proteinG: 20,
          carbsG: 22,
          fatG: 7,
          fiberG: 5,
          dataQuality: "serving",
          source: "Open Food Facts",
        },
      }),
    });
  });

  await page.goto("/?demo=1");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Plan & targets" }).click();
  await expect(page.getByRole("heading", { name: /Your plan/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit plan inputs" }).click();
  await page.getByLabel("Age").fill("36");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page.getByText("What we're aiming at")).toBeVisible();

  await page.getByRole("link", { name: "Log a meal" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "meal.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(page.getByText("Mock chicken rice bowl")).toBeVisible();
  await page.getByRole("button", { name: "Save meal" }).click();
  await expect(page.getByText("Mock chicken rice bowl")).toBeVisible();

  await page.getByRole("button", { name: "Barcode" }).click();
  await page.getByPlaceholder("e.g. 5057545012345").fill("1234567890123");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("Mock protein bar")).toBeVisible();
  await page.getByLabel("Servings").fill("2");
  await page.getByRole("button", { name: "Add to today" }).click();
  await expect(page.getByText("Mock protein bar")).toBeVisible();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Coach" }).click();
  await page.getByLabel("Your message").fill("I am busy tonight");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Log dinner before you eat it.")).toBeVisible();
});
