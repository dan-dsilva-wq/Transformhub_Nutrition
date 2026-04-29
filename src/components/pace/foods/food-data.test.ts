import { describe, expect, it } from "vitest";
import { foodGroups, isFoodAllowed } from "./food-data";

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
});
