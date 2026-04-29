export interface FoodSearchItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  servingText: string;
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  source: "USDA FoodData Central";
}

export interface ParsedFoodSearchQuery {
  original: string;
  searchTerms: string;
  amount?: {
    quantity: number;
    unit: string;
    grams: number;
  };
}

interface UsdaFoodNutrient {
  nutrientId?: number;
  nutrientName?: string;
  value?: number;
  unitName?: string;
}

interface UsdaFoodSearchResult {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaFoodNutrient[];
}

export interface UsdaSearchResponse {
  foods?: UsdaFoodSearchResult[];
}

export interface FoodDatabaseRow {
  source_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  serving_text: string;
  serving_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  source: "USDA FoodData Central";
}

const nutrientIds = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
} as const;

const unitToGrams: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  litre: 1000,
  litres: 1000,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,
};

const pieceLikeUnits = new Set([
  "egg",
  "eggs",
  "slice",
  "slices",
  "piece",
  "pieces",
  "serving",
  "servings",
  "banana",
  "bananas",
  "apple",
  "apples",
]);

export function parseFoodSearchQuery(query: string): ParsedFoodSearchQuery {
  const original = query.trim().replace(/\s+/g, " ");
  const match = original.match(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*([a-zA-Z]+)?\b\s*(.*)$/);

  if (!match) {
    return { original, searchTerms: original };
  }

  const rawQuantity = match[1].replace(",", ".");
  const quantity = rawQuantity.includes("/")
    ? rawQuantity
        .split("/")
        .map((part) => Number(part.trim()))
        .reduce((acc, part, index) => (index === 0 ? part : acc / part), 0)
    : Number(rawQuantity);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { original, searchTerms: original };
  }

  const unit = match[2]?.toLowerCase();
  const rest = match[3]?.trim() ?? "";

  if (!unit || pieceLikeUnits.has(unit)) {
    return {
      original,
      searchTerms: rest || unit || original,
      amount: { quantity, unit: unit || "serving", grams: quantity },
    };
  }

  const gramsPerUnit = unitToGrams[unit];

  if (!gramsPerUnit) {
    return { original, searchTerms: [unit, rest].filter(Boolean).join(" "), amount: undefined };
  }

  return {
    original,
    searchTerms: rest || original,
    amount: {
      quantity,
      unit,
      grams: quantity * gramsPerUnit,
    },
  };
}

function nutrientValue(food: UsdaFoodSearchResult, id: number) {
  return food.foodNutrients?.find((nutrient) => nutrient.nutrientId === id)?.value ?? 0;
}

function normaliseServingGrams(food: UsdaFoodSearchResult) {
  const servingSize = Number(food.servingSize);
  const unit = food.servingSizeUnit?.toLowerCase();

  if (!Number.isFinite(servingSize) || servingSize <= 0) {
    return 100;
  }

  if (unit === "g" || unit === "gram" || unit === "grams") {
    return servingSize;
  }

  if (unit === "ml" || unit === "milliliter" || unit === "milliliters") {
    return servingSize;
  }

  return 100;
}

export function normaliseUsdaFood(food: UsdaFoodSearchResult): FoodSearchItem {
  const servingGrams = normaliseServingGrams(food);
  const servingText = food.householdServingFullText || `${Math.round(servingGrams)} g`;

  return {
    id: String(food.fdcId),
    name: food.description || `USDA food ${food.fdcId}`,
    brand: food.brandName || food.brandOwner || undefined,
    category: food.foodCategory || undefined,
    servingText,
    servingGrams,
    caloriesPer100g: nutrientValue(food, nutrientIds.calories),
    proteinPer100g: nutrientValue(food, nutrientIds.protein),
    carbsPer100g: nutrientValue(food, nutrientIds.carbs),
    fatPer100g: nutrientValue(food, nutrientIds.fat),
    fiberPer100g: nutrientValue(food, nutrientIds.fiber),
    source: "USDA FoodData Central",
  };
}

export function foodSearchItemToDatabaseRow(food: FoodSearchItem): FoodDatabaseRow {
  return {
    source_id: food.id,
    name: food.name,
    brand: food.brand ?? null,
    category: food.category ?? null,
    serving_text: food.servingText,
    serving_grams: food.servingGrams,
    calories_per_100g: food.caloriesPer100g,
    protein_per_100g: food.proteinPer100g,
    carbs_per_100g: food.carbsPer100g,
    fat_per_100g: food.fatPer100g,
    fiber_per_100g: food.fiberPer100g,
    source: food.source,
  };
}

export function databaseRowToFoodSearchItem(row: FoodDatabaseRow): FoodSearchItem {
  return {
    id: row.source_id,
    name: row.name,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    servingText: row.serving_text,
    servingGrams: Number(row.serving_grams),
    caloriesPer100g: Number(row.calories_per_100g),
    proteinPer100g: Number(row.protein_per_100g),
    carbsPer100g: Number(row.carbs_per_100g),
    fatPer100g: Number(row.fat_per_100g),
    fiberPer100g: Number(row.fiber_per_100g),
    source: row.source,
  };
}
