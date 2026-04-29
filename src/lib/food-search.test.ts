import { describe, expect, it } from "vitest";
import { normaliseUsdaFood, parseFoodSearchQuery } from "./food-search";

describe("food search helpers", () => {
  it("keeps piece portions useful while searching the food name", () => {
    expect(parseFoodSearchQuery("1 Egg")).toMatchObject({
      searchTerms: "egg",
      amount: { quantity: 1, unit: "egg" },
    });
  });

  it("turns common volume amounts into gram-equivalent amounts", () => {
    expect(parseFoodSearchQuery("200ml milk")).toMatchObject({
      searchTerms: "milk",
      amount: { quantity: 200, unit: "ml", grams: 200 },
    });
  });

  it("uses USDA household serving text and grams when available", () => {
    const food = normaliseUsdaFood({
      fdcId: 123,
      description: "Egg, whole, cooked",
      servingSize: 50,
      servingSizeUnit: "g",
      householdServingFullText: "1 large",
      foodNutrients: [
        { nutrientId: 1008, value: 155 },
        { nutrientId: 1003, value: 13 },
      ],
    });

    expect(food).toMatchObject({
      servingText: "1 large",
      servingGrams: 50,
      caloriesPer100g: 155,
      proteinPer100g: 13,
    });
  });
});
