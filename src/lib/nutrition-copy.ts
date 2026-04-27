import type { DailyTargets } from "./targets";
import type { DietaryPref, NutritionPlan } from "./state/types";
import { filterApprovedFoods } from "./meal-plan";

export interface FallbackPlanInput {
  name?: string;
  targets: DailyTargets;
  mealsPerDay: number;
  prefs: DietaryPref[];
  approvedFoods: string[];
}

function pickNames(items: { name: string }[], n: number): string[] {
  return items.slice(0, n).map((f) => f.name);
}

function listOr(names: string[], fallback: string): string {
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function greeting(name: string | undefined): string {
  return name ? `${name}, ` : "";
}

export function buildFallbackPlan(
  input: FallbackPlanInput,
): NutritionPlan["copy"] {
  const { name, targets, mealsPerDay, prefs, approvedFoods } = input;

  const allowed = filterApprovedFoods(approvedFoods, prefs);
  const proteinNames = pickNames(allowed.proteins, 3);
  const carbNames = pickNames(allowed.carbs, 3);
  const fiberNames = pickNames(allowed.fiber, 3);
  const fatNames = pickNames(allowed.fats, 3);

  const palmsPerMeal = Math.max(1, Math.round(targets.proteinG / 25 / mealsPerDay));
  const carbsPerMeal = Math.max(0, Math.round(targets.carbsG / 30 / mealsPerDay));
  const fistsPerMeal = Math.max(1, Math.round(targets.fiberG / 4 / mealsPerDay));
  const thumbsPerMeal = Math.max(0, Math.round(targets.fatG / 12 / mealsPerDay));

  const hello = greeting(name);

  return {
    overview: {
      headline: "Why this plan works",
      body:
        `${hello}your plan is built from three numbers: ${targets.calories} kcal a day, ${targets.proteinG}g of protein, and ${mealsPerDay} meals. ` +
        `That calorie target sits a step below your maintenance level, so the scale moves at a steady, sustainable pace. ` +
        `Protein is the anchor — keep it high and the rest of your plate gets easier.\n\n` +
        `You won't weigh food. You'll use your hand. A palm of protein, a cupped hand of carbs, a fist of veg, a thumb of fats. ` +
        `It's portable, it scales with your body, and it works in any kitchen.`,
      bullets: [
        `${targets.calories} kcal · ${targets.proteinG}g protein · ${mealsPerDay} meals/day`,
        "Hand portions scale with your body — no scales, no apps mid-meal",
        "Trust hunger and the weekly weight trend, not single days",
      ],
    },
    protein: {
      headline: "Protein is the anchor",
      body:
        `Aim for ${targets.proteinG}g of protein a day — about ${palmsPerMeal} palm${palmsPerMeal === 1 ? "" : "s"} per meal across ${mealsPerDay} meals. ` +
        `One palm of cooked meat, fish, or a similar source is roughly 25g of protein. ` +
        `Protein keeps you full, protects muscle while you lose fat, and is the hardest macro to overeat.\n\n` +
        `From your list, lead with ${listOr(proteinNames, "lean meats, fish, eggs, or Greek yogurt")}. ` +
        `Build the meal around the protein first, then add the rest.`,
      bullets: [
        `1 palm ≈ 25g protein. Daily target: ${targets.proteinG}g`,
        `${palmsPerMeal} palm${palmsPerMeal === 1 ? "" : "s"} per meal × ${mealsPerDay} meals`,
        "If you're hungry, more protein is almost always the answer",
      ],
    },
    carbs: {
      headline: "Carbs fuel the work",
      body:
        `Carbs aren't the enemy — they're fuel. You're aiming for ${targets.carbsG}g a day, about ${carbsPerMeal} cupped hand${carbsPerMeal === 1 ? "" : "s"} per meal. ` +
        `One cupped hand of cooked rice, oats, potato, or pasta is roughly 30g of carbs. ` +
        `On training days, lean into the upper end. On rest days, ease off slightly.\n\n` +
        `From your list, ${listOr(carbNames, "rice, oats, potatoes, or wholegrain bread")} all work. ` +
        `Pick what you genuinely like — the best plan is one you'll actually eat.`,
      bullets: [
        `1 cupped hand ≈ 30g carbs. Daily target: ${targets.carbsG}g`,
        "Eat the bigger carb portion close to your workout",
        "Whole, minimally processed sources keep you full longer",
      ],
    },
    fats: {
      headline: "Fats — small portion, big role",
      body:
        `Fat is energy-dense, so portions are small: ${targets.fatG}g a day, about ${thumbsPerMeal} thumb${thumbsPerMeal === 1 ? "" : "s"} per meal. ` +
        `One thumb of olive oil, butter, nut butter, or avocado is roughly 12g of fat. ` +
        `Fat slows digestion (helping fullness), carries fat-soluble vitamins, and makes food taste like food.\n\n` +
        `From your list, ${listOr(fatNames, "olive oil, avocado, nuts, or seeds")} are easy wins. ` +
        `Quality matters more than quantity at this volume.`,
      bullets: [
        `1 thumb ≈ 12g fat. Daily target: ${targets.fatG}g`,
        "Cooking oils, dressings, and nut butters add up fast — measure with your eye",
        "Mix sources: olive oil, nuts, oily fish, avocado",
      ],
    },
    fiber: {
      headline: "Fiber and veg fill the plate",
      body:
        `Aim for ${targets.fiberG}g of fiber a day — roughly ${fistsPerMeal} fist${fistsPerMeal === 1 ? "" : "s"} of vegetables per meal. ` +
        `One fist of cooked or chopped veg is roughly 4g of fiber. ` +
        `Veg is the cheat code: low calorie, high fullness, and packed with the micronutrients that keep your energy steady.\n\n` +
        `From your list, ${listOr(fiberNames, "leafy greens, broccoli, peppers, or berries")} all count. ` +
        `If a meal feels small, double the veg.`,
      bullets: [
        `1 fist ≈ 4g fiber. Daily target: ${targets.fiberG}g`,
        "Half your plate, most meals, should be veg",
        "Frozen veg counts — grab it when fresh is a hassle",
      ],
    },
    beverages: {
      headline: "Drink the calories you don't notice",
      body:
        `Liquid calories are the easiest to overlook and the easiest to cut. ` +
        `You're aiming for around ${targets.waterMl} ml of water a day — that's roughly ${Math.round(targets.waterMl / 250)} glasses. ` +
        `Coffee and tea (without sugar or full-fat milk) effectively count toward that.\n\n` +
        `Sodas, juices, and milky coffees can quietly add 300–600 kcal to a day. ` +
        `Alcohol counts too — about 7 kcal per gram, no protein, no satiety. Cap it at the social moments and use sparkling water in between.`,
      bullets: [
        `Water target: ${targets.waterMl} ml/day`,
        "Black coffee, tea, sparkling water — free pours",
        "Treat juices, sodas, and pints like meals: have them on purpose",
      ],
    },
    plate: {
      headline: "Build the plate",
      body:
        `Every meal follows the same shape. Start with protein — ${palmsPerMeal} palm${palmsPerMeal === 1 ? "" : "s"}. ` +
        `Add ${carbsPerMeal} cupped hand${carbsPerMeal === 1 ? "" : "s"} of carbs and ${thumbsPerMeal} thumb${thumbsPerMeal === 1 ? "" : "s"} of fats. ` +
        `Fill the rest with ${fistsPerMeal} fist${fistsPerMeal === 1 ? "" : "s"} of veg.\n\n` +
        `That's it. The same template covers eggs and toast at 8am, chicken and rice at 1pm, and salmon and roasted veg at 7pm. ` +
        `Once your eye is calibrated, you'll do it without thinking.`,
      bullets: [
        `${palmsPerMeal} palm protein · ${carbsPerMeal} cupped hand carbs · ${fistsPerMeal} fist veg · ${thumbsPerMeal} thumb fats`,
        "Build the protein first, fill in around it",
        "Same template, different ingredients — that's the point",
      ],
    },
    timing: {
      headline: "Spread it across the day",
      body:
        `${mealsPerDay} meals a day works for most people: enough hunger to enjoy each meal, enough protein at each sitting to land the daily total. ` +
        `Aim for the first meal within an hour or two of waking, and the last 2–3 hours before bed.\n\n` +
        `Don't stress the exact clock. If a meal slips, you don't need to "make it up" — your next meal is the next opportunity. ` +
        `Consistency over the week beats precision on any single day.`,
      bullets: [
        `${mealsPerDay} meals across the day`,
        "First meal within 1–2 hours of waking; last 2–3 hours before bed",
        "Missed a meal? Move on. The week is what matters",
      ],
    },
  };
}
