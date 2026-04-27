"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { buildMealSlots, filterApprovedFoods } from "@/lib/meal-plan";
import { Card } from "../primitives";
import { MealSlotCard } from "./meal-slot-card";

export function TodayPlate() {
  const { targets, approvedFoods, onboardingExtras } = useAppState();
  const prefs = onboardingExtras.dietaryPreferences;
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;

  const slots = buildMealSlots(targets, mealsPerDay);
  const foodsByCategory = filterApprovedFoods(approvedFoods, prefs);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        Today&apos;s plate
      </p>
      <ul className="mt-3 space-y-2">
        {slots.map((slot) => {
          const open = expanded === slot.key;
          return (
            <li key={slot.key}>
              <button
                type="button"
                data-tap
                onClick={() => setExpanded(open ? null : slot.key)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-3.5 py-3 text-left backdrop-blur-xl transition hover:bg-white/75"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-2">
                    {slot.label}
                  </span>
                  <span className="text-xs text-muted">
                    <span className="numerals text-ink-2">
                      {slot.calorieTarget}
                    </span>{" "}
                    kcal ·{" "}
                    <span className="numerals text-ink-2">{slot.proteinG}</span>
                    g P
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={clsx(
                    "shrink-0 text-muted transition",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open ? (
                <div className="mt-2">
                  <MealSlotCard
                    slot={slot}
                    foodsByCategory={foodsByCategory}
                    approvedFoods={approvedFoods}
                    prefs={prefs}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
