"use client";

import { Beef, Wheat, Salad, Droplet } from "lucide-react";
import type { FoodCategory, FoodItem } from "@/lib/nutrition";
import type { MealSlot } from "@/lib/meal-plan";
import type { DietaryPref } from "@/lib/state/types";
import { Card, IconBadge } from "../primitives";
import { RecipeIdeas } from "./recipe-ideas";

const categoryLabels: Record<FoodCategory, string> = {
  proteins: "Proteins",
  carbs: "Carbs",
  fiber: "Veg & fiber",
  fats: "Fats",
};

const categoryTone: Record<FoodCategory, "forest" | "amber" | "sage" | "clay"> =
  {
    proteins: "forest",
    carbs: "amber",
    fiber: "sage",
    fats: "clay",
  };

const categoryIcon: Record<FoodCategory, React.ReactNode> = {
  proteins: <Beef size={14} aria-hidden />,
  carbs: <Wheat size={14} aria-hidden />,
  fiber: <Salad size={14} aria-hidden />,
  fats: <Droplet size={14} aria-hidden />,
};

function pluralize(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function portionLine(portions: MealSlot["portions"]): string {
  const parts: string[] = [];
  if (portions.proteins > 0) {
    parts.push(`${pluralize(portions.proteins, "palm", "palms")} protein`);
  }
  if (portions.carbs > 0) {
    parts.push(
      `${pluralize(portions.carbs, "cupped hand", "cupped hands")} carbs`,
    );
  }
  if (portions.fiber > 0) {
    parts.push(`${pluralize(portions.fiber, "fist", "fists")} veg`);
  }
  if (portions.fats > 0) {
    parts.push(`${pluralize(portions.fats, "thumb", "thumbs")} fats`);
  }
  return parts.join(" · ");
}

export function MealSlotCard({
  slot,
  foodsByCategory,
  approvedFoods,
  prefs,
}: {
  slot: MealSlot;
  foodsByCategory: Record<FoodCategory, FoodItem[]>;
  approvedFoods: string[];
  prefs: DietaryPref[];
}) {
  const eyebrow = slot.timeHint
    ? `${slot.label.toUpperCase()} · ${slot.timeHint}`
    : slot.label.toUpperCase();

  return (
    <Card>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-2xl text-ink-2">{slot.label}</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="numerals text-ink-2">{slot.calorieTarget}</span> kcal
        </span>
        <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="numerals text-ink-2">{slot.proteinG}</span>g P
        </span>
        <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="numerals text-ink-2">{slot.carbsG}</span>g C
        </span>
        <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 backdrop-blur">
          <span className="numerals text-ink-2">{slot.fatG}</span>g F
        </span>
      </div>

      <p className="mt-3 text-sm text-ink-2">{portionLine(slot.portions)}</p>

      <section className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Foods you can eat
        </p>
        <ul className="mt-2 space-y-2">
          {(Object.keys(categoryLabels) as FoodCategory[]).map((cat) => {
            const items = foodsByCategory[cat];
            if (!items.length) return null;
            return (
              <li
                key={cat}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/55 px-3 py-2.5 backdrop-blur-xl"
              >
                <IconBadge tone={categoryTone[cat]}>
                  {categoryIcon[cat]}
                </IconBadge>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                    {categoryLabels[cat]}
                  </div>
                  <div className="text-sm text-ink-2">
                    {items.map((f) => f.name).join(", ")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <RecipeIdeas slot={slot} approvedFoods={approvedFoods} prefs={prefs} />
    </Card>
  );
}
