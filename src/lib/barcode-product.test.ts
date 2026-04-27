import { describe, expect, it } from "vitest";
import { normaliseOpenFoodFactsProduct } from "./barcode-product";

describe("normaliseOpenFoodFactsProduct", () => {
  it("uses per-serving product nutrition when available", () => {
    const product = normaliseOpenFoodFactsProduct(
      {
        status: 1,
        product: {
          code: "123",
          product_name: "Protein bar",
          brands: "Lean Test",
          serving_size: "60 g",
          nutriments: {
            "energy-kcal_serving": 210,
            proteins_serving: 20,
            carbohydrates_serving: 22,
            fat_serving: 7,
            fiber_serving: 5,
          },
        },
      },
      "123",
    );

    expect(product).toMatchObject({
      name: "Protein bar",
      brand: "Lean Test",
      servingSize: "60 g",
      calories: 210,
      proteinG: 20,
      dataQuality: "serving",
    });
  });

  it("scales per-100g nutrition by serving quantity", () => {
    const product = normaliseOpenFoodFactsProduct(
      {
        status: 1,
        product: {
          code: "456",
          product_name: "Greek yogurt",
          serving_quantity: 150,
          nutriments: {
            "energy-kcal_100g": 80,
            proteins_100g: 9.8,
            carbohydrates_100g: 5.2,
            fat_100g: 1.5,
            fiber_100g: 0,
          },
        },
      },
      "456",
    );

    expect(product).toMatchObject({
      calories: 120,
      proteinG: 14.7,
      carbsG: 7.8,
      fatG: 2.3,
      servingSize: "150 g",
      dataQuality: "per_100g",
    });
  });

  it("returns null for missing products", () => {
    expect(normaliseOpenFoodFactsProduct({ status: 0 }, "999")).toBeNull();
  });
});
