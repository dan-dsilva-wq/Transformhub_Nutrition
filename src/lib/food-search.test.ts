import { describe, expect, it } from "vitest";
import {
  databaseRowToFoodSearchItem,
  normaliseUsdaFood,
  parseFoodSearchQuery,
  rankFoodSearchItems,
  type FoodSearchItem,
} from "./food-search";

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

  it("uses a per-egg serving fallback for whole egg results that only say 100 g", () => {
    const food = normaliseUsdaFood({
      fdcId: 456,
      description: "Eggs, Grade A, large",
      servingSize: 100,
      servingSizeUnit: "g",
      foodNutrients: [{ nutrientId: 1008, value: 143 }],
    });

    expect(food).toMatchObject({
      servingText: "1 large egg",
      servingGrams: 50,
    });
  });

  it("applies the egg serving fallback to cached rows too", () => {
    const food = databaseRowToFoodSearchItem({
      source_id: "cached-egg",
      name: "Eggs, Grade A",
      brand: null,
      category: "Dairy and Egg Products",
      serving_text: "100 g",
      serving_grams: 100,
      calories_per_100g: 143,
      protein_per_100g: 12.6,
      carbs_per_100g: 0.7,
      fat_per_100g: 9.5,
      fiber_per_100g: 0,
      source: "USDA FoodData Central",
    });

    expect(food.servingText).toBe("1 large egg");
    expect(food.servingGrams).toBe(50);
  });

  it("ranks plain whole eggs above noisy branded egg matches", () => {
    const base = {
      id: "x",
      servingText: "100 g",
      servingGrams: 100,
      caloriesPer100g: 100,
      proteinPer100g: 10,
      carbsPer100g: 0,
      fatPer100g: 5,
      fiberPer100g: 0,
      source: "USDA FoodData Central",
    } satisfies Omit<FoodSearchItem, "name">;

    const foods = rankFoodSearchItems("egg", [
      { ...base, id: "snickers", name: "Egg, Snickers, candy" },
      { ...base, id: "just", name: "Egg, JUST, 3 tbsp", brand: "JUST" },
      { ...base, id: "grade-a", name: "Eggs, Grade A", category: "Dairy and Egg Products" },
    ]);

    expect(foods.map((food) => food.id)).toEqual(["grade-a", "just"]);
    expect(foods[0]).toMatchObject({ servingText: "1 large egg", servingGrams: 50 });
  });
});
