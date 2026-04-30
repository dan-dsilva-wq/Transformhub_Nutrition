import { expect, test } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test("mobile onboarding, mocked meal estimate, and coach flow", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("pace.state.v1");
    window.localStorage.setItem(
      "pace.state.v2:demo",
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
    const body = route.request().postDataJSON() as { message?: string };
    if (body.message?.toLowerCase().includes("python")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          coach: {
            reply:
              "I'm here to help with your food, nutrition, and progress tracking. Tell me what you ate or what you're aiming for today.",
            tone: "gentle_supportive",
            suggestedActions: ["Log a meal"],
            checkInQuestion: "What did you eat today?",
            riskFlag: "none",
          },
          model: "mock",
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        coach: {
          reply: "Estimated at 710 calories. Add this to today?",
          tone: "firm_supportive",
          suggestedActions: ["Add to today", "Edit first"],
          checkInQuestion: "What is the next action?",
          riskFlag: "none",
          draftMeal: {
            name: "Costco pizza slice",
            portion: "1 slice",
            calories: 710,
            proteinG: 34,
            carbsG: 78,
            fatG: 28,
            fiberG: 4,
            confidence: 0.65,
          },
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
  const planLink = page.getByRole("link", { name: "You & targets" });
  await expect(planLink).toBeVisible();
  await planLink.evaluate((element) => (element as HTMLElement).click());
  await expect(page.getByRole("heading", { name: /targets/i })).toBeVisible();
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
  await expect(page.getByLabel("Photo notes")).toBeVisible();
  await page.getByLabel("Photo notes").fill("diet coke not pictured");
  await page.getByRole("button", { name: "Analyse with notes" }).click();
  await expect(page.getByText("Mock chicken rice bowl")).toBeVisible();
  await page.getByRole("button", { name: "Save to today" }).click();
  await expect(page.getByText("Mock chicken rice bowl")).toBeVisible();

  await page.getByRole("button", { name: "Barcode" }).click();
  await page.getByPlaceholder("e.g. 5057545012345").fill("1234567890123");
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("Mock protein bar")).toBeVisible();
  await page.getByLabel("Servings").fill("2");
  await page.getByRole("button", { name: "Add to today" }).click();
  await expect(page.getByText("Mock protein bar")).toBeVisible();

  const coachLink = page.getByRole("link", { name: "Coach" }).first();
  await expect(coachLink).toBeVisible();
  await coachLink.click();
  await page.getByLabel("Your message").fill("I had a Costco pizza slice earlier");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Estimated at 710 calories. Add this to today?")).toBeVisible();
  await page.getByRole("button", { name: "Add to today" }).click();
  await expect(page.getByRole("button", { name: "Added" })).toBeVisible();

  await page.getByLabel("Your message").fill("write a Python script");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/food, nutrition, and progress tracking/i)).toBeVisible();
});
