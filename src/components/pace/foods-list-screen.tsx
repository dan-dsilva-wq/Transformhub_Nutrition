"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { clsx } from "clsx";
import {
  foodCatalog,
  handPortions,
  type FoodCategory,
} from "@/lib/nutrition";
import { useAppState } from "@/lib/state/app-state";
import { isFoodAllowed } from "@/lib/meal-plan";
import { Card, IconBadge } from "./primitives";
import { LockedState } from "./paywall-sheet";

const categoryLabels: Record<FoodCategory, string> = {
  proteins: "Proteins",
  carbs: "Carbs",
  fiber: "Fiber",
  fats: "Fats",
};

const categoryTone: Record<FoodCategory, "forest" | "amber" | "sage" | "clay"> =
  {
    proteins: "forest",
    carbs: "amber",
    fiber: "sage",
    fats: "clay",
  };

export function FoodsListScreen() {
  const { approvedFoods, onboardingExtras, actions } = useAppState();
  const [tab, setTab] = useState<FoodCategory>("proteins");

  const approvedSet = useMemo(() => new Set(approvedFoods), [approvedFoods]);
  const prefs = onboardingExtras.dietaryPreferences;

  function toggle(name: string) {
    const next = approvedSet.has(name)
      ? approvedFoods.filter((f) => f !== name)
      : [...approvedFoods, name];
    actions.setApprovedFoods(next);
  }

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-6">
        <header>
          <Link
            href="/you/foods"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden /> Back to plan
          </Link>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            YOU · FOOD LIST
          </p>
          <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
            Pick what you <span className="text-forest">like.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Toggle foods on. Your eating plan rebuilds from this list.
          </p>
        </header>

        <div className="grid grid-cols-4 gap-1 rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl">
          {(Object.keys(categoryLabels) as FoodCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              data-tap
              onClick={() => setTab(c)}
              className={clsx(
                "rounded-full px-2 py-2 text-sm font-medium transition",
                tab === c
                  ? "bg-white/85 text-ink-2 shadow-sm border border-white/70"
                  : "text-muted",
              )}
              aria-pressed={tab === c}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-3">
            <IconBadge tone={categoryTone[tab]}>
              <Heart size={16} aria-hidden />
            </IconBadge>
            <div>
              <h2 className="font-display text-lg text-ink-2">
                {categoryLabels[tab]}
              </h2>
              <p className="text-xs text-muted">Portion: {handPortions[tab]}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {foodCatalog[tab].map((f) => {
              const on = approvedSet.has(f.name);
              const allowed = isFoodAllowed(f, prefs);
              return (
                <li key={f.name}>
                  <button
                    type="button"
                    data-tap
                    onClick={() => toggle(f.name)}
                    aria-pressed={on}
                    disabled={!allowed}
                    className={clsx(
                      "flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left backdrop-blur-xl transition",
                      !allowed && "opacity-50",
                      on
                        ? "border-forest/30 bg-sage/15"
                        : "border-white/70 bg-white/60 hover:bg-white/80",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink-2">
                        {f.name}
                      </div>
                      <div className="text-xs text-muted">
                        {allowed ? f.note : "Hidden by your dietary preferences"}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        on
                          ? "bg-forest text-white"
                          : "border border-white/70 bg-white/70 text-muted",
                      )}
                    >
                      {on ? "On list" : "Add"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </LockedState>
  );
}
