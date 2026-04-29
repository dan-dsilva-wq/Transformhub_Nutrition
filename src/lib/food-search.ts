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

interface ParsedFoodSearchQuery {
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

const pieceLikeUnits = new Set<string>([
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
  "orange",
  "oranges",
  "pear",
  "pears",
  "kiwi",
  "kiwis",
  "avocado",
  "avocados",
]);

const commonWholeFoods: Record<
  string,
  Omit<FoodSearchItem, "id" | "source">
> = {
  banana: {
    name: "Banana",
    category: "Fruit",
    servingText: "1 medium banana",
    servingGrams: 118,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
  },
  apple: {
    name: "Apple",
    category: "Fruit",
    servingText: "1 medium apple",
    servingGrams: 182,
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
  },
  orange: {
    name: "Orange",
    category: "Fruit",
    servingText: "1 medium orange",
    servingGrams: 131,
    caloriesPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 11.8,
    fatPer100g: 0.1,
    fiberPer100g: 2.4,
  },
  pear: {
    name: "Pear",
    category: "Fruit",
    servingText: "1 medium pear",
    servingGrams: 178,
    caloriesPer100g: 57,
    proteinPer100g: 0.4,
    carbsPer100g: 15.2,
    fatPer100g: 0.1,
    fiberPer100g: 3.1,
  },
  kiwi: {
    name: "Kiwi",
    category: "Fruit",
    servingText: "1 kiwi",
    servingGrams: 75,
    caloriesPer100g: 61,
    proteinPer100g: 1.1,
    carbsPer100g: 14.7,
    fatPer100g: 0.5,
    fiberPer100g: 3,
  },
  avocado: {
    name: "Avocado",
    category: "Fruit",
    servingText: "1 medium avocado",
    servingGrams: 150,
    caloriesPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
    fiberPer100g: 6.7,
  },
};

const wholeEggExclusions = [
  "white",
  "whites",
  "substitute",
  "liquid",
  "powder",
  "dried",
  "frozen",
  "omelet",
  "omelette",
  "salad",
  "sandwich",
  "noodle",
  "nog",
  "roll",
  "custard",
  "just",
  "snickers",
  "galarie",
];

const noisyEggWords = [
  "snickers",
  "galarie",
  "candy",
  "cookie",
  "cake",
  "chocolate",
  "noodle",
  "nog",
  "roll",
  "sandwich",
  "salad",
  "substitute",
  "liquid",
];

const noisyProduceWords = [
  "baby",
  "bar",
  "bread",
  "cake",
  "candy",
  "chips",
  "cookie",
  "dried",
  "drink",
  "flavor",
  "flavored",
  "frozen",
  "juice",
  "muffin",
  "pie",
  "powder",
  "pudding",
  "sauce",
  "smoothie",
  "snack",
  "yogurt",
];

export function isPieceLikeUnit(unit: string) {
  return pieceLikeUnits.has(unit.toLowerCase());
}

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

function tokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? ([] as string[]);
}

function isWholeEggFood(name: string) {
  const nameTokens = tokens(name);

  if (!nameTokens.some((token) => token === "egg" || token === "eggs")) {
    return false;
  }

  return !wholeEggExclusions.some((word) => nameTokens.includes(word));
}

function normaliseCommonFoodKey(value: string) {
  const [firstToken] = tokens(value);
  if (!firstToken) return null;
  if (firstToken.endsWith("s")) {
    const singular = firstToken.slice(0, -1);
    if (commonWholeFoods[singular]) return singular;
  }
  return commonWholeFoods[firstToken] ? firstToken : null;
}

export function commonWholeFoodSearchItem(query: string): FoodSearchItem | null {
  const key = normaliseCommonFoodKey(query);
  if (!key) return null;
  const food = commonWholeFoods[key];
  return {
    ...food,
    id: `common-${key}`,
    source: "USDA FoodData Central",
  };
}

function servingForFood(food: Pick<FoodSearchItem, "name" | "servingText" | "servingGrams">) {
  if (
    isWholeEggFood(food.name) &&
    food.servingGrams >= 95 &&
    /^(?:100\s*g|100\s*grams?)$/i.test(food.servingText.trim())
  ) {
    return { servingText: "1 large egg", servingGrams: 50 };
  }

  const commonKey = normaliseCommonFoodKey(food.name);
  if (
    commonKey &&
    food.servingGrams >= 95 &&
    /^(?:100\s*g|100\s*grams?)$/i.test(food.servingText.trim())
  ) {
    const common = commonWholeFoods[commonKey];
    return { servingText: common.servingText, servingGrams: common.servingGrams };
  }

  return { servingText: food.servingText, servingGrams: food.servingGrams };
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
  const rawServingGrams = normaliseServingGrams(food);
  const rawServingText = food.householdServingFullText || `${Math.round(rawServingGrams)} g`;
  const name = food.description || `USDA food ${food.fdcId}`;
  const { servingText, servingGrams } = servingForFood({
    name,
    servingText: rawServingText,
    servingGrams: rawServingGrams,
  });

  return {
    id: String(food.fdcId),
    name,
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

export function rankFoodSearchItems(query: string, foods: FoodSearchItem[]) {
  const parsed = parseFoodSearchQuery(query);
  const queryTokens = tokens(parsed.searchTerms || query);
  const isEggQuery = queryTokens.length === 1 && (queryTokens[0] === "egg" || queryTokens[0] === "eggs");
  const commonKey = normaliseCommonFoodKey(parsed.searchTerms || query);

  return [...foods]
    .map((food, index) => {
      const nameTokens = tokens(food.name);
      const categoryTokens = tokens(food.category ?? "");
      const joinedName = food.name.toLowerCase();
      let score = 0;

      for (const token of queryTokens) {
        if (nameTokens.includes(token)) score += 40;
        if (joinedName.startsWith(token)) score += 20;
        if (categoryTokens.includes(token)) score += 8;
      }

      if (isEggQuery) {
        if (isWholeEggFood(food.name)) score += 80;
        if (!food.brand) score += 20;
        if (food.servingText.toLowerCase().includes("egg")) score += 25;
        if (food.brand) score -= 30;
        if (noisyEggWords.some((word) => nameTokens.includes(word))) score -= 120;
      }

      if (commonKey) {
        const isPlainProduce =
          nameTokens.length <= 3 &&
          nameTokens.includes(commonKey) &&
          !food.brand &&
          !noisyProduceWords.some((word) => nameTokens.includes(word));
        if (isPlainProduce) score += 100;
        if (food.name.toLowerCase() === commonWholeFoods[commonKey].name.toLowerCase()) {
          score += 80;
        }
        if (food.brand) score -= 35;
        if (noisyProduceWords.some((word) => nameTokens.includes(word))) score -= 90;
      }

      return { food, index, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ food }) => {
      const serving = servingForFood(food);
      return { ...food, ...serving };
    });
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
  const name = row.name;
  const serving = servingForFood({
    name,
    servingText: row.serving_text,
    servingGrams: Number(row.serving_grams),
  });

  return {
    id: row.source_id,
    name,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    servingText: serving.servingText,
    servingGrams: serving.servingGrams,
    caloriesPer100g: Number(row.calories_per_100g),
    proteinPer100g: Number(row.protein_per_100g),
    carbsPer100g: Number(row.carbs_per_100g),
    fatPer100g: Number(row.fat_per_100g),
    fiberPer100g: Number(row.fiber_per_100g),
    source: row.source,
  };
}
