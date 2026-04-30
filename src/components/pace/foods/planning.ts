import type { DailyTargets } from "@/lib/targets";
import type { DietaryPref } from "@/lib/state/types";
import { recipeKeys, recipes, type Recipe } from "./food-data";

type RecipeSlot = NonNullable<Recipe["slots"]>[number];
type RecipeTag = NonNullable<Recipe["tags"]>[number];
type RecipeAllergen = NonNullable<Recipe["allergens"]>[number];

interface RecipeRules {
  slots: RecipeSlot[];
  tags?: RecipeTag[];
  allergens?: RecipeAllergen[];
}

export interface SlotTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const fallbackRules: Record<string, RecipeRules> = {
  "Yogurt + oats + berries": {
    slots: ["breakfast", "snack"],
    tags: ["dairy"],
    allergens: ["milk", "tree-nut"],
  },
  "Eggs on toast": {
    slots: ["breakfast"],
    tags: ["egg"],
    allergens: ["egg", "wheat", "gluten"],
  },
  "Chicken & rice bowl": {
    slots: ["lunch", "dinner"],
    tags: ["meat"],
    allergens: [],
  },
  "Salmon & sweet potato": {
    slots: ["dinner"],
    tags: ["fish"],
    allergens: ["fish"],
  },
  "Tofu stir-fry + rice": {
    slots: ["lunch", "dinner"],
    tags: ["plant", "soy"],
    allergens: ["soy"],
  },
  "Tuna jacket potato": {
    slots: ["lunch", "dinner"],
    tags: ["fish"],
    allergens: ["fish"],
  },
  "Chicken wrap + greens": {
    slots: ["lunch"],
    tags: ["meat"],
    allergens: ["wheat", "gluten"],
  },
};

const allergenSkipTerms: Record<RecipeAllergen, string[]> = {
  milk: ["milk", "dairy", "lactose", "cheese", "yogurt", "yoghurt", "whey"],
  egg: ["egg", "eggs"],
  fish: ["fish", "salmon", "tuna", "cod", "haddock", "trout"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "mussel", "clam", "oyster", "scallop"],
  "tree-nut": ["tree nut", "tree nuts", "nut", "nuts", "almond", "walnut", "pecan", "cashew", "hazelnut"],
  peanut: ["peanut", "peanuts", "peanut butter"],
  wheat: ["wheat", "bread", "wrap", "pasta", "cous cous", "couscous", "bulgar", "barley", "rye", "sourdough"],
  soy: ["soy", "soya", "tofu", "tempeh", "edamame"],
  sesame: ["sesame", "tahini", "hummus"],
  gluten: ["gluten", "wheat", "bread", "wrap", "pasta", "cous cous", "couscous", "bulgar", "barley", "rye", "sourdough"],
};

const dietaryAllergenBlocks: Partial<Record<DietaryPref, RecipeAllergen[]>> = {
  "no-dairy": ["milk"],
  "no-gluten": ["gluten", "wheat"],
  "no-peanuts": ["peanut"],
  "no-tree-nuts": ["tree-nut"],
  "no-fish": ["fish"],
  "no-shellfish": ["shellfish"],
  "no-soy": ["soy"],
  "no-eggs": ["egg"],
  "no-sesame": ["sesame"],
};

export function mealSlotsFor(mealsPerDay: number): string[] {
  if (mealsPerDay <= 2) return ["Breakfast", "Dinner"];
  if (mealsPerDay >= 5) return ["Breakfast", "Mid-morning", "Lunch", "Afternoon", "Dinner"];
  if (mealsPerDay === 4) return ["Breakfast", "Lunch", "Snack", "Dinner"];
  return ["Breakfast", "Lunch", "Dinner"];
}

export function rotatedDayNames(): string[] {
  const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  return [...base.slice(today), ...base.slice(0, today)];
}

export function weekStartFromToday(offsetWeeks: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetWeeks * 7);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function slotKindFor(slot: string): RecipeSlot {
  const normalized = slot.toLowerCase();
  if (normalized.includes("breakfast")) return "breakfast";
  if (normalized.includes("snack") || normalized.includes("morning") || normalized.includes("afternoon")) {
    return "snack";
  }
  if (normalized.includes("lunch")) return "lunch";
  return "dinner";
}

function rulesFor(key: string, recipe: Recipe): RecipeRules {
  const fallback = fallbackRules[key];
  return {
    slots: recipe.slots ?? fallback?.slots ?? ["lunch", "dinner"],
    tags: recipe.tags ?? fallback?.tags ?? [],
    allergens: recipe.allergens ?? fallback?.allergens ?? [],
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGlutenFreeLabel(name: string): boolean {
  return /\bgluten[- ]free\b/.test(normalize(name));
}

export function ingredientMatchesSkip(name: string, skipped: string[]): boolean {
  const ingredient = normalize(name);
  if (!ingredient) return false;

  return skipped.some((skip) => {
    const blocked = normalize(skip);
    if (!blocked) return false;
    if ((blocked === "gluten" || blocked === "wheat") && isGlutenFreeLabel(name)) {
      return false;
    }
    const blockedAllergens = skippedAllergenBlocks([blocked]);
    for (const allergen of blockedAllergens) {
      const terms = allergenSkipTerms[allergen] ?? [];
      if (terms.some((term) => ingredient.includes(normalize(term)))) return true;
    }
    return ingredient === blocked || ingredient.includes(blocked) || blocked.includes(ingredient);
  });
}

function skippedAllergenBlocks(skipped: string[]): Set<RecipeAllergen> {
  const out = new Set<RecipeAllergen>();
  for (const raw of skipped) {
    const skip = normalize(raw);
    if (!skip) continue;
    for (const [allergen, terms] of Object.entries(allergenSkipTerms) as [RecipeAllergen, string[]][]) {
      if (terms.some((term) => skip === normalize(term) || skip.includes(normalize(term)))) {
        out.add(allergen);
      }
    }
    if (skip === "seafood") {
      out.add("fish");
      out.add("shellfish");
    }
  }
  return out;
}

export function recipeHasSkipped(recipe: Recipe, skipped: string[], key = ""): boolean {
  if (!skipped.length) return false;
  if (recipe.ingredients.some((ingredient) => ingredientMatchesSkip(ingredient.n, skipped))) {
    return true;
  }

  const blockedAllergens = skippedAllergenBlocks(skipped);
  if (!blockedAllergens.size) return false;

  const allergens = rulesFor(key, recipe).allergens ?? [];
  return allergens.some((allergen) => blockedAllergens.has(allergen));
}

export function recipeAllowedForPreferences(
  key: string,
  recipe: Recipe,
  dietaryPreferences: DietaryPref[],
  skipped: string[] = [],
): boolean {
  const rules = rulesFor(key, recipe);
  const tags = new Set(rules.tags ?? []);
  const allergens = new Set(rules.allergens ?? []);

  if (recipeHasSkipped(recipe, skipped, key)) return false;
  if (dietaryPreferences.includes("vegan") && ["meat", "pork", "fish", "shellfish", "dairy", "egg"].some((tag) => tags.has(tag as RecipeTag))) {
    return false;
  }
  if (dietaryPreferences.includes("vegetarian") && ["meat", "pork", "fish", "shellfish"].some((tag) => tags.has(tag as RecipeTag))) {
    return false;
  }
  if (dietaryPreferences.includes("pescatarian") && (tags.has("meat") || tags.has("pork"))) {
    return false;
  }
  if (dietaryPreferences.includes("halal") && tags.has("pork")) return false;
  if (dietaryPreferences.includes("kosher") && (tags.has("pork") || tags.has("shellfish"))) {
    return false;
  }

  for (const preference of dietaryPreferences) {
    const blocked = dietaryAllergenBlocks[preference] ?? [];
    if (blocked.some((allergen) => allergens.has(allergen))) return false;
  }

  return true;
}

export function recipeFitsSlot(key: string, recipe: Recipe, slot: string): boolean {
  return rulesFor(key, recipe).slots.includes(slotKindFor(slot));
}

export function pickRecipeKey(
  shift: number,
  dayIdx: number,
  slotIdx: number,
  banned: Set<string>,
  skipped: string[],
  dietaryPreferences: DietaryPref[],
  slot: string,
  usedToday: Set<string> = new Set(),
): string {
  const fitsSlot = recipeKeys.filter((key) => {
    if (banned.has(key)) return false;
    const recipe = recipes[key];
    if (!recipe) return false;
    return recipeFitsSlot(key, recipe, slot) && recipeAllowedForPreferences(key, recipe, dietaryPreferences, skipped);
  });

  const safeFallback = recipeKeys.filter((key) => {
    if (banned.has(key)) return false;
    const recipe = recipes[key];
    return recipe ? recipeAllowedForPreferences(key, recipe, dietaryPreferences, skipped) : false;
  });

  const baseList = fitsSlot.length > 0 ? fitsSlot : safeFallback.length > 0 ? safeFallback : recipeKeys;
  const unused = baseList.filter((k) => !usedToday.has(k));
  const list = unused.length > 0 ? unused : baseList;
  return list[(dayIdx + shift + slotIdx * 3) % list.length];
}

function slotWeights(slots: string[]): number[] {
  if (slots.length <= 2) return [0.4, 0.6];
  if (slots.length === 3) return [0.3, 0.35, 0.35];
  if (slots.length === 4) return [0.28, 0.34, 0.12, 0.26];
  return [0.24, 0.11, 0.3, 0.11, 0.24];
}

function splitTarget(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
  let used = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return Math.max(Math.round(total - used), 0);
    const value = Math.max(Math.round((total * weight) / sum), 0);
    used += value;
    return value;
  });
}

export function slotTargetsFor(mealsPerDay: number, targets: DailyTargets): SlotTarget[] {
  const slots = mealSlotsFor(mealsPerDay);
  const weights = slotWeights(slots);
  const calories = splitTarget(targets.calories, weights);
  const protein = splitTarget(targets.proteinG, weights);
  const carbs = splitTarget(targets.carbsG, weights);
  const fat = splitTarget(targets.fatG, weights);

  return slots.map((_, index) => ({
    calories: calories[index] ?? 0,
    proteinG: protein[index] ?? 0,
    carbsG: carbs[index] ?? 0,
    fatG: fat[index] ?? 0,
  }));
}

export function dayPlannedNutrition(
  day: { meals: { key: string }[] },
  mealsPerDay: number,
  targets: DailyTargets,
): SlotTarget {
  const slotTargets = slotTargetsFor(mealsPerDay, targets);
  return day.meals.reduce(
    (total, meal, index) => {
      const recipe = recipes[meal.key];
      if (!recipe) return total;
      const slot = slotTargets[index];
      const portionFactor =
        slot && recipe.kcal > 0 ? slot.calories / recipe.kcal : 1;
      const clamped = Math.min(Math.max(portionFactor, 0.5), 1.5);
      return {
        calories: total.calories + Math.round(recipe.kcal * clamped),
        proteinG: total.proteinG + Math.round(recipe.p * clamped),
        carbsG: total.carbsG + Math.round(recipe.c * clamped),
        fatG: total.fatG + Math.round(recipe.f * clamped),
      };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function plannedNutritionForRecipe(
  recipe: Recipe,
  slotIndex: number,
  mealsPerDay: number,
  targets: DailyTargets,
): SlotTarget & { portionFactor: number } {
  const target = slotTargetsFor(mealsPerDay, targets)[slotIndex] ?? {
    calories: recipe.kcal,
    proteinG: recipe.p,
    carbsG: recipe.c,
    fatG: recipe.f,
  };
  const portionFactor = recipe.kcal > 0 ? target.calories / recipe.kcal : 1;

  return {
    calories: target.calories,
    proteinG: Math.round(recipe.p * portionFactor),
    carbsG: Math.round(recipe.c * portionFactor),
    fatG: Math.round(recipe.f * portionFactor),
    portionFactor,
  };
}
