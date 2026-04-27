import {
  allFoodItems,
  foodCatalog,
  quickMeals,
  type FoodCategory,
  type FoodItem,
  type QuickMeal,
} from "./nutrition";
import type { DailyTargets } from "./targets";
import type { DietaryPref } from "./state/types";

export type MealSlotId = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealSlot {
  id: MealSlotId;
  /** Stable key for React lists when the same slot id repeats (e.g., two snacks). */
  key: string;
  label: string;
  timeHint?: string;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  portions: {
    proteins: number;
    carbs: number;
    fiber: number;
    fats: number;
  };
}

interface SlotShape {
  id: MealSlotId;
  label: string;
  ratio: number;
  timeHint: string;
}

const slotPlans: Record<2 | 3 | 4 | 5, SlotShape[]> = {
  2: [
    { id: "breakfast", label: "Breakfast", ratio: 0.45, timeHint: "08:00" },
    { id: "dinner", label: "Dinner", ratio: 0.55, timeHint: "19:00" },
  ],
  3: [
    { id: "breakfast", label: "Breakfast", ratio: 0.30, timeHint: "08:00" },
    { id: "lunch", label: "Lunch", ratio: 0.35, timeHint: "13:00" },
    { id: "dinner", label: "Dinner", ratio: 0.35, timeHint: "19:00" },
  ],
  4: [
    { id: "breakfast", label: "Breakfast", ratio: 0.25, timeHint: "08:00" },
    { id: "lunch", label: "Lunch", ratio: 0.30, timeHint: "13:00" },
    { id: "snack", label: "Snack", ratio: 0.15, timeHint: "16:00" },
    { id: "dinner", label: "Dinner", ratio: 0.30, timeHint: "19:00" },
  ],
  5: [
    { id: "breakfast", label: "Breakfast", ratio: 0.22, timeHint: "08:00" },
    { id: "snack", label: "Mid-morning", ratio: 0.10, timeHint: "10:30" },
    { id: "lunch", label: "Lunch", ratio: 0.28, timeHint: "13:00" },
    { id: "snack", label: "Afternoon", ratio: 0.10, timeHint: "16:00" },
    { id: "dinner", label: "Dinner", ratio: 0.30, timeHint: "19:00" },
  ],
};

function clampMeals(n: number | undefined): 2 | 3 | 4 | 5 {
  const v = n ?? 3;
  if (v <= 2) return 2;
  if (v >= 5) return 5;
  return v as 3 | 4;
}

function round(value: number) {
  return Math.round(value);
}

function roundTo(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

export function buildMealSlots(
  targets: DailyTargets,
  mealsPerDay: number | undefined,
): MealSlot[] {
  const meals = clampMeals(mealsPerDay);
  return slotPlans[meals].map((shape, index) => {
    const proteinG = round(targets.proteinG * shape.ratio);
    const carbsG = round(targets.carbsG * shape.ratio);
    const fatG = round(targets.fatG * shape.ratio);
    const fiberG = round(targets.fiberG * shape.ratio);
    return {
      id: shape.id,
      key: `${shape.id}-${index}`,
      label: shape.label,
      timeHint: shape.timeHint,
      calorieTarget: roundTo(targets.calories * shape.ratio, 5),
      proteinG,
      carbsG,
      fatG,
      fiberG,
      portions: {
        proteins: Math.max(1, Math.round(proteinG / 25)),
        carbs: Math.max(0, Math.round(carbsG / 30)),
        fiber: Math.max(1, Math.round(fiberG / 4)),
        fats: Math.max(0, Math.round(fatG / 12)),
      },
    };
  });
}

const meatNames = new Set([
  "Chicken breast",
  "Turkey mince",
  "Lean beef mince",
]);

const fishNames = new Set([
  "Tuna or salmon",
  "White fish",
  "Prawns",
]);

const animalSecondaryNames = new Set([
  "Eggs",
  "Greek yogurt",
  "Cottage cheese",
  "Cheese",
]);

const dairyNames = new Set([
  "Greek yogurt",
  "Cottage cheese",
  "Cheese",
]);

const glutenNames = new Set([
  "Wholegrain wraps",
  "Wholegrain pasta",
  "Sourdough bread",
  "Noodles",
  "Oats",
]);

function isExcluded(name: string, prefs: DietaryPref[]): boolean {
  for (const pref of prefs) {
    switch (pref) {
      case "vegan":
        if (
          meatNames.has(name) ||
          fishNames.has(name) ||
          animalSecondaryNames.has(name)
        ) {
          return true;
        }
        break;
      case "vegetarian":
        if (meatNames.has(name) || fishNames.has(name)) return true;
        break;
      case "pescatarian":
        if (meatNames.has(name)) return true;
        break;
      case "no-dairy":
        if (dairyNames.has(name)) return true;
        break;
      case "no-gluten":
        if (glutenNames.has(name)) return true;
        break;
      case "halal":
      case "kosher":
      case "omnivore":
        break;
    }
  }
  return false;
}

export function isFoodAllowed(food: FoodItem, prefs: DietaryPref[]): boolean {
  return !isExcluded(food.name, prefs);
}

export function filterApprovedFoods(
  approvedFoods: string[],
  prefs: DietaryPref[],
): Record<FoodCategory, FoodItem[]> {
  const approvedSet = new Set(approvedFoods);
  const result: Record<FoodCategory, FoodItem[]> = {
    proteins: [],
    carbs: [],
    fiber: [],
    fats: [],
  };
  for (const item of allFoodItems) {
    if (!approvedSet.has(item.name)) continue;
    if (!isFoodAllowed(item, prefs)) continue;
    result[item.category].push(item);
  }
  return result;
}

export function filterAllowedCatalog(
  prefs: DietaryPref[],
): Record<FoodCategory, FoodItem[]> {
  const result: Record<FoodCategory, FoodItem[]> = {
    proteins: [],
    carbs: [],
    fiber: [],
    fats: [],
  };
  (Object.keys(foodCatalog) as FoodCategory[]).forEach((cat) => {
    result[cat] = foodCatalog[cat].filter((f) => isFoodAllowed(f, prefs));
  });
  return result;
}

function isMealAllowed(meal: QuickMeal, prefs: DietaryPref[]): boolean {
  return meal.foodNames.every((name) => !isExcluded(name, prefs));
}

function approvedOverlapRatio(meal: QuickMeal, approved: Set<string>): number {
  if (meal.foodNames.length === 0) return 0;
  const matches = meal.foodNames.filter((n) => approved.has(n)).length;
  return matches / meal.foodNames.length;
}

export function suggestRecipes(
  approvedFoods: string[],
  prefs: DietaryPref[],
  slot: Pick<MealSlot, "id">,
  limit = 3,
): QuickMeal[] {
  const approved = new Set(approvedFoods);
  const allowed = quickMeals.filter((m) => isMealAllowed(m, prefs));
  const matchSlot = allowed.filter(
    (m) => m.mealHint === slot.id || m.mealHint === "any" || !m.mealHint,
  );

  const ranked = [...matchSlot]
    .map((m) => ({ meal: m, overlap: approvedOverlapRatio(m, approved) }))
    .sort((a, b) => b.overlap - a.overlap);

  const strong = ranked.filter((r) => r.overlap >= 0.5);
  if (strong.length >= limit) {
    return strong.slice(0, limit).map((r) => r.meal);
  }

  const seen = new Set(strong.map((r) => r.meal.name));
  const filler = ranked.filter((r) => !seen.has(r.meal.name));
  return [...strong, ...filler].slice(0, limit).map((r) => r.meal);
}

export function dietaryLabel(prefs: DietaryPref[]): string {
  if (prefs.length === 0) return "Omnivore";
  if (prefs.includes("vegan")) return "Vegan";
  if (prefs.includes("vegetarian")) return "Vegetarian";
  if (prefs.includes("pescatarian")) return "Pescatarian";
  return prefs
    .map((p) => p.replace(/-/g, " "))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" · ");
}
