import { describe, expect, it } from "vitest";
import { foodGroups, isFoodAllowed, recipes } from "./food-data";
import {
  ingredientMatchesSkip,
  mealSlotsFor,
  pickRecipeKey,
  recipeAllowedForPreferences,
  recipeFitsSlot,
  slotTargetsFor,
} from "./planning";

describe("food guide diet filtering", () => {
  it("keeps vegan protein options broad enough to build meals", () => {
    const proteinGroup = foodGroups.find((group) => group.cat === "proteins");
    expect(proteinGroup).toBeDefined();

    const veganProteins =
      proteinGroup?.items.filter((item) => isFoodAllowed(item, "vegan")) ?? [];

    expect(veganProteins.map((item) => item.n)).toEqual(
      expect.arrayContaining([
        "Tofu",
        "Tempeh",
        "Seitan",
        "Edamame",
        "Lentils",
        "Chickpeas",
        "Pea protein powder",
        "Textured vegetable protein",
      ]),
    );
    expect(veganProteins.length).toBeGreaterThanOrEqual(12);
  });

  it("treats gluten and allergy preferences as hard recipe filters", () => {
    expect(
      recipeAllowedForPreferences("Eggs on toast", recipes["Eggs on toast"], ["no-gluten"]),
    ).toBe(false);
    expect(
      recipeAllowedForPreferences(
        "Chicken wrap + greens",
        recipes["Chicken wrap + greens"],
        ["no-gluten"],
      ),
    ).toBe(false);
    expect(
      recipeAllowedForPreferences(
        "Yogurt + oats + berries",
        recipes["Yogurt + oats + berries"],
        ["no-gluten"],
      ),
    ).toBe(true);
    expect(
      recipeAllowedForPreferences(
        "Yogurt + oats + berries",
        recipes["Yogurt + oats + berries"],
        ["no-tree-nuts"],
      ),
    ).toBe(false);
  });

  it("does not treat labelled gluten-free oats as unsafe for a gluten skip", () => {
    expect(ingredientMatchesSkip("Gluten-free rolled oats", ["gluten"])).toBe(false);
    expect(ingredientMatchesSkip("Wholegrain bread", ["gluten"])).toBe(true);
  });

  it("keeps snacks as snack recipes", () => {
    const key = pickRecipeKey(0, 0, 1, new Set(), [], [], "Mid-morning");
    expect(recipeFitsSlot(key, recipes[key], "Mid-morning")).toBe(true);
  });

  it("splits meal-plan calories to the daily target for any meal count", () => {
    const targets = {
      calories: 1600,
      proteinG: 140,
      carbsG: 160,
      fatG: 50,
      fiberG: 30,
      waterMl: 2500,
      steps: 8000,
      rmr: 1500,
      tdee: 2100,
      deficit: 500,
      weeklyWeightChangeKg: -0.5,
      weeklyLossKg: 0.5,
      workoutsPerWeek: 3,
      exerciseMinutesPerWeek: 150,
      notes: [],
    };

    for (const mealsPerDay of [2, 3, 4, 5]) {
      const slots = mealSlotsFor(mealsPerDay);
      const split = slotTargetsFor(mealsPerDay, targets);
      expect(split).toHaveLength(slots.length);
      expect(split.reduce((sum, slot) => sum + slot.calories, 0)).toBe(1600);
    }
  });
});
