"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ListChecks } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import {
  buildMealSlots,
  dietaryLabel,
  filterApprovedFoods,
} from "@/lib/meal-plan";
import { LockedState } from "./paywall-sheet";
import { PlanHeader } from "./foods/plan-header";
import { MealSlotCard } from "./foods/meal-slot-card";

export function FoodsScreen() {
  const { targets, approvedFoods, onboardingExtras } = useAppState();
  const prefs = onboardingExtras.dietaryPreferences;
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const name = onboardingExtras.name;

  const slots = useMemo(
    () => buildMealSlots(targets, mealsPerDay),
    [targets, mealsPerDay],
  );

  const foodsByCategory = useMemo(
    () => filterApprovedFoods(approvedFoods, prefs),
    [approvedFoods, prefs],
  );

  const approvedCount =
    foodsByCategory.proteins.length +
    foodsByCategory.carbs.length +
    foodsByCategory.fiber.length +
    foodsByCategory.fats.length;

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-6">
        <PlanHeader
          name={name}
          mealsPerDay={mealsPerDay}
          dietaryLabel={dietaryLabel(prefs)}
          targets={targets}
        />

        <Link
          href="/you/foods/list"
          data-tap
          className="tap-bounce flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm text-ink-2 backdrop-blur-xl hover:bg-white/75"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cream text-forest">
              <ListChecks size={16} aria-hidden />
            </span>
            <span>
              <span className="block font-medium">Edit my list</span>
              <span className="text-xs text-muted">
                {approvedCount} food{approvedCount === 1 ? "" : "s"} on your
                list
              </span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        <ul className="space-y-5">
          {slots.map((slot) => (
            <li key={slot.key}>
              <MealSlotCard
                slot={slot}
                foodsByCategory={foodsByCategory}
                approvedFoods={approvedFoods}
                prefs={prefs}
              />
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted">
          Portions are guides, not rules. Trust hunger, energy, and the weekly
          trend on the scale.
        </p>
      </div>
    </LockedState>
  );
}
