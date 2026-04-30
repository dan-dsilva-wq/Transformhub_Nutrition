"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import {
  foodGroups,
  isFoodAllowed,
  type FoodDietPref,
  type FoodItem,
} from "./foods/food-data";

const dietOptions: { value: FoodDietPref; label: string }[] = [
  { value: "omnivore", label: "All" },
  { value: "pescatarian", label: "Pesc" },
  { value: "vegetarian", label: "Veggie" },
  { value: "vegan", label: "Vegan" },
];

function sameFood(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function FoodsListScreen() {
  const { onboardingExtras, actions } = useAppState();
  const unlikedFoods = onboardingExtras.unlikedFoods ?? [];
  const skippedIngredients = onboardingExtras.skippedIngredients ?? [];
  const activeDiet = onboardingExtras.foodDiet ?? "omnivore";
  const [query, setQuery] = useState("");

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foodGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!isFoodAllowed(item, activeDiet)) return false;
          if (!q) return true;
          return item.n.toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeDiet, query]);

  const visibleCount = visibleGroups.reduce((total, group) => total + group.items.length, 0);
  const blockedCount = new Set([
    ...unlikedFoods.map((food) => food.toLowerCase()),
    ...skippedIngredients.map((food) => food.toLowerCase()),
  ]).size;

  function isLiked(item: FoodItem) {
    return !unlikedFoods.some((food) => sameFood(food, item.n));
  }

  function toggleFood(item: FoodItem) {
    const liked = isLiked(item);
    const nextUnliked = liked
      ? [...unlikedFoods, item.n]
      : unlikedFoods.filter((food) => !sameFood(food, item.n));
    const nextSkipped = liked
      ? Array.from(new Set([...skippedIngredients, item.n]))
      : skippedIngredients.filter((food) => !sameFood(food, item.n));

    actions.setOnboardingExtras({
      unlikedFoods: nextUnliked,
      skippedIngredients: nextSkipped,
      weekGenerated: false,
      weekSwaps: {},
      shoppingChecked: [],
    });
  }

  function setDiet(value: FoodDietPref) {
    actions.setOnboardingExtras({
      foodDiet: value,
      weekGenerated: false,
      weekSwaps: {},
      shoppingChecked: [],
    });
  }

  function resetFoods() {
    actions.setOnboardingExtras({
      unlikedFoods: [],
      skippedIngredients: [],
      weekGenerated: false,
      weekSwaps: {},
      shoppingChecked: [],
    });
  }

  return (
    <div className="stagger-up space-y-4 pb-32">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/you/foods"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink-2 shadow-sm backdrop-blur"
          aria-label="Back to food week"
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted">
          {blockedCount} hidden
        </p>
        <button
          type="button"
          data-tap
          onClick={resetFoods}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink-2 shadow-sm backdrop-blur"
          aria-label="Reset hidden foods"
        >
          <RotateCcw size={14} aria-hidden />
        </button>
      </div>

      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          FOOD LIST
        </p>
        <h1 className="font-display mt-1 text-[34px] leading-[1.04] text-ink-2">
          Keep what you <span className="text-forest">actually eat.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Uncheck foods you dislike or cannot eat. We remove them from future weeks and the shopping list.
        </p>
      </header>

      <div className="rounded-3xl border border-white/85 bg-white/60 p-3 shadow-card backdrop-blur-xl">
        <label className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2">
          <Search size={15} className="text-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search foods"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-2 outline-none placeholder:text-faint"
          />
          {query ? (
            <button
              type="button"
              data-tap
              onClick={() => setQuery("")}
              className="grid h-7 w-7 place-items-center rounded-full text-muted"
              aria-label="Clear search"
            >
              <X size={13} aria-hidden />
            </button>
          ) : null}
        </label>

        <div className="mt-3 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {dietOptions.map((option) => {
            const active = option.value === activeDiet;
            return (
              <button
                key={option.value}
                type="button"
                data-tap
                onClick={() => setDiet(option.value)}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  active ? "bg-forest text-white" : "bg-white/80 text-ink-2",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleCount === 0 ? (
        <div className="rounded-3xl border border-white/85 bg-white/55 p-8 text-center text-sm text-muted">
          No foods match that search.
        </div>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.cat} className="rounded-3xl bg-white/70 p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{group.emoji}</span>
                <div>
                  <h2 className="font-display text-xl leading-tight text-ink-2">
                    {group.name}
                  </h2>
                  <p className="text-[11px] text-muted">{group.sub}</p>
                </div>
              </div>
              <span className="text-[11px] text-muted numerals">
                {group.items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {group.items.map((item) => {
                const liked = isLiked(item);
                return (
                  <button
                    key={item.n}
                    type="button"
                    data-tap
                    onClick={() => toggleFood(item)}
                    className={clsx(
                      "tap-bounce flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                      liked
                        ? "border-hairline bg-white text-ink-2"
                        : "border-clay/30 bg-clay/5 text-clay",
                    )}
                    aria-pressed={liked}
                  >
                    <span
                      className={clsx(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px]",
                        liked
                          ? "border-forest bg-forest text-white"
                          : "border-clay bg-white text-transparent",
                      )}
                    >
                      {liked ? <Check size={12} aria-hidden /> : null}
                    </span>
                    <span className="text-xl leading-none">{item.e}</span>
                    <span className={clsx("min-w-0 flex-1 text-sm", !liked && "line-through")}>
                      {item.n}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
