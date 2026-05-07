import { NextResponse } from "next/server";
import { z } from "zod";
import {
  commonWholeFoodSearchItem,
  databaseRowToFoodSearchItem,
  foodSearchItemToDatabaseRow,
  normaliseUsdaFood,
  parseFoodSearchQuery,
  rankFoodSearchItems,
  type FoodDatabaseRow,
  type UsdaSearchResponse,
} from "@/lib/food-search";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const searchSchema = z.string().trim().min(2).max(80);

function escapeLike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function searchCachedFoods(query: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const pattern = `%${escapeLike(query)}%`;
  const { data, error } = await supabase
    .from("food_database")
    .select(
      "source_id, name, brand, category, serving_text, serving_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source",
    )
    .or(`name.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern}`)
    .limit(8)
    .returns<FoodDatabaseRow[]>();

  if (error) {
    return [];
  }

  return (data ?? []).map(databaseRowToFoodSearchItem);
}

async function cacheFoods(foods: ReturnType<typeof normaliseUsdaFood>[]) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const rows = foods.filter(Boolean).map((food) => foodSearchItemToDatabaseRow(food));

  if (!rows.length) {
    return;
  }

  await supabase.from("food_database").upsert(rows, { onConflict: "source,source_id" });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsed = searchSchema.safeParse(requestUrl.searchParams.get("q") ?? "");

  if (!parsed.success) {
    return NextResponse.json({ foods: [] });
  }

  const foodQuery = parseFoodSearchQuery(parsed.data);
  const searchTerms = foodQuery.searchTerms || parsed.data;
  const commonFood = commonWholeFoodSearchItem(searchTerms);
  const cachedFoods = rankFoodSearchItems(searchTerms, await searchCachedFoods(searchTerms));
  const cachedWithCommon = commonFood
    ? [commonFood, ...cachedFoods.filter((food) => food.id !== commonFood.id)]
    : cachedFoods;

  if (cachedWithCommon.length >= 4) {
    return NextResponse.json({ foods: cachedWithCommon.slice(0, 8), source: "cache" });
  }

  const apiKey = process.env.FDC_API_KEY || "DEMO_KEY";
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchTerms,
        pageSize: 20,
        pageNumber: 1,
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
      }),
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      if (cachedWithCommon.length) {
        return NextResponse.json({ foods: cachedWithCommon.slice(0, 8), source: "cache" });
      }
      return NextResponse.json({ error: "Food search is unavailable right now." }, { status: 502 });
    }

    const payload = (await response.json()) as UsdaSearchResponse;
    const foods = (payload.foods ?? [])
      .map(normaliseUsdaFood)
      .filter((food) => food.caloriesPer100g || food.proteinPer100g || food.carbsPer100g || food.fatPer100g);
    const rankedFoods = rankFoodSearchItems(searchTerms, foods);
    const rankedWithCommon = commonFood
      ? [commonFood, ...rankedFoods.filter((food) => food.id !== commonFood.id)]
      : rankedFoods;

    await cacheFoods(rankedWithCommon);

    return NextResponse.json({ foods: rankedWithCommon.slice(0, 8), source: "usda" });
  } catch {
    if (cachedWithCommon.length) {
      return NextResponse.json({ foods: cachedWithCommon, source: "cache" });
    }

    return NextResponse.json({ error: "Could not search foods." }, { status: 502 });
  }
}
