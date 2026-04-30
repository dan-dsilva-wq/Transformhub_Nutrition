import { recipes, type Recipe } from "./food-data";
import {
  ingredientMatchesSkip as ingredientMatchesBlockedFood,
  recipeHasSkipped as recipeHasBlockedFood,
} from "./planning";

export type Aisle =
  | "produce"
  | "protein"
  | "pantry"
  | "dairy"
  | "frozen"
  | "bakery"
  | "other";

export interface AisleMeta {
  id: Aisle;
  emoji: string;
  label: string;
  tint: string;
}

export const aisles: AisleMeta[] = [
  { id: "produce", emoji: "🥬", label: "Produce", tint: "#a7f3d0" },
  { id: "protein", emoji: "🐟", label: "Protein", tint: "#fde1c4" },
  { id: "bakery", emoji: "🍞", label: "Bakery", tint: "#f6e2bd" },
  { id: "dairy", emoji: "🥛", label: "Dairy & eggs", tint: "#e0e8f5" },
  { id: "pantry", emoji: "🌾", label: "Pantry", tint: "#bae6fd" },
  { id: "frozen", emoji: "❄", label: "Frozen", tint: "#cfeefb" },
  { id: "other", emoji: "•", label: "Other", tint: "#ece7d6" },
];

export const aislesById: Record<Aisle, AisleMeta> = aisles.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<Aisle, AisleMeta>,
);

/**
 * Common pantry items that are pre-suggested as "already at home". The user can
 * remove or add to this list. Match is by lower-cased ingredient name including
 * substring (so "Olive oil" in pantry hides "Olive oil" ingredients).
 */
export const DEFAULT_PANTRY: string[] = [
  "Olive oil",
  "Salt",
  "Pepper",
  "Salt, pepper, paprika",
  "Soy sauce + garlic",
  "Honey (optional)",
];

/**
 * Heuristic — assigns an ingredient to an aisle based on its name. Cheap, no
 * data tagging required on every recipe. Returns "other" as fallback.
 */
export function aisleFor(name: string): Aisle {
  const n = name.toLowerCase();
  if (
    /(yogurt|yoghurt|cottage cheese|cheese|milk|butter|cream|quark|feta|halloumi|mozzarella|parmesan|cheddar|whey|ghee|crème fraîche|sour cream|egg)/.test(
      n,
    )
  ) {
    return "dairy";
  }
  if (
    /(chicken|turkey|beef|steak|mince|lamb|pork|duck|bacon|sausage|ham|venison|tofu|tempeh|seitan|salmon|tuna|cod|haddock|trout|halibut|tilapia|seabass|mackerel|sardine|prawn|shrimp|scallop|squid|octopus|lobster|crab|mussel|clam|oyster|fish|protein|tin)/.test(
      n,
    )
  ) {
    return "protein";
  }
  if (
    /(bread|toast|wrap|pita|tortilla|bagel|sourdough|wholegrain|baguette|roll)/.test(
      n,
    )
  ) {
    return "bakery";
  }
  if (
    /(rice|oats|quinoa|pasta|noodle|cous cous|couscous|bulgar|buckwheat|barley|lentil|chickpea|bean|polenta|flour|sugar|honey|maple|cornflour|sauce|garlic|ginger|spice|salt|pepper|paprika|cumin|cinnamon|oil|vinegar|stock|broth|tahini|nut butter|almond butter|peanut butter|chia|flax|seed|soy)/.test(
      n,
    )
  ) {
    return "pantry";
  }
  if (
    /(frozen|berries|peas|sweetcorn|edamame|frozen veg)/.test(n) &&
    /frozen/.test(n)
  ) {
    return "frozen";
  }
  if (
    /(spinach|kale|rocket|salad|lettuce|tomato|cucumber|carrot|onion|shallot|leek|garlic clove|broccoli|cauliflower|cabbage|courgette|zucchini|pepper|chilli|chili|aubergine|eggplant|mushroom|asparagus|celery|fennel|avocado|potato|sweet potato|squash|pumpkin|beetroot|herb|coriander|cilantro|parsley|basil|mint|thyme|rosemary|sage|dill|lemon|lime|orange|apple|banana|pear|peach|nectarine|plum|berries|blueberr|raspberr|strawberr|blackberr|mango|kiwi|grape|melon|pineapple|fruit|jackfruit|olive|veg)/.test(
      n,
    )
  ) {
    return "produce";
  }
  return "other";
}

export interface ShoppingItem {
  /** Display name (e.g. "Salmon fillet"). */
  name: string;
  /** Lower-cased dedup key. */
  key: string;
  emoji: string;
  aisle: Aisle;
  /** Total occurrences across the week (used as a rough quantity hint). */
  count: number;
  /** "Wed lunch · Sun dinner" — which meal slots use this. */
  occurrences: { day: string; slot: string; recipe: string; q: string }[];
  /** True when this item is also marked as a hero (appears in 2+ days). */
  hero: boolean;
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Build a flat shopping list from a week's recipe assignments, applying
 * skippedIngredients and pantryStaples as filters.
 */
export function buildShoppingList(
  meals: { dayIdx: number; slot: string; key: string }[],
  opts: {
    skippedIngredients?: string[];
    pantryStaples?: string[];
    dayLabels?: string[];
  } = {},
): { items: ShoppingItem[]; pantryHits: string[] } {
  const skip = new Set(
    (opts.skippedIngredients ?? []).map((s) => s.toLowerCase()),
  );
  const pantry = new Set(
    (opts.pantryStaples ?? DEFAULT_PANTRY).map((s) => s.toLowerCase()),
  );
  const seen = new Map<string, ShoppingItem>();
  const pantryHits = new Set<string>();

  for (const m of meals) {
    const recipe: Recipe | undefined = recipes[m.key];
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      const key = ing.n.toLowerCase().trim();
      if (skip.has(key) || ingredientMatchesBlockedFood(ing.n, opts.skippedIngredients ?? [])) continue;
      if (pantry.has(key)) {
        pantryHits.add(ing.n);
        continue;
      }
      const day = opts.dayLabels?.[m.dayIdx] ?? dayLabels[m.dayIdx] ?? "";
      const occ = {
        day,
        slot: m.slot,
        recipe: m.key,
        q: ing.q,
      };
      const existing = seen.get(key);
      if (existing) {
        existing.count += 1;
        existing.occurrences.push(occ);
      } else {
        seen.set(key, {
          name: ing.n,
          key,
          emoji: ing.e,
          aisle: aisleFor(ing.n),
          count: 1,
          occurrences: [occ],
          hero: false,
        });
      }
    }
  }

  const items = [...seen.values()];
  for (const item of items) {
    const days = new Set(item.occurrences.map((o) => o.day));
    item.hero = days.size >= 2 && item.aisle === "protein";
  }

  // sort: protein first within aisle so heroes float to top
  items.sort((a, b) => {
    if (a.aisle !== b.aisle) {
      return aisles.findIndex((x) => x.id === a.aisle) - aisles.findIndex((x) => x.id === b.aisle);
    }
    if (a.hero !== b.hero) return a.hero ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    items,
    pantryHits: [...pantryHits].sort(),
  };
}

export function groupByAisle(items: ShoppingItem[]): Map<Aisle, ShoppingItem[]> {
  const out = new Map<Aisle, ShoppingItem[]>();
  for (const it of items) {
    const arr = out.get(it.aisle) ?? [];
    arr.push(it);
    out.set(it.aisle, arr);
  }
  return out;
}

export function ingredientMatchesSkip(name: string, skipped: string[]): boolean {
  return ingredientMatchesBlockedFood(name, skipped);
}

/** True if a recipe contains any skipped ingredient — used to filter recipe pool. */
export function recipeHasSkipped(recipe: Recipe, skipped: string[]): boolean {
  return recipeHasBlockedFood(recipe, skipped);
}
