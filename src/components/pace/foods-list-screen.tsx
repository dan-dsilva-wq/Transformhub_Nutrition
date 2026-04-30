"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { resolveGoalIntent } from "@/lib/targets";
import { LockedState } from "./paywall-sheet";
import {
  foodGroups,
  isFoodAllowed,
  type FoodCategory,
  type FoodDietPref,
  type FoodItem,
} from "./foods/food-data";

const dietChips: { id: FoodDietPref; label: string }[] = [
  { id: "omnivore", label: "Omnivore" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];

const bannerTone: Record<FoodCategory["cat"], string> = {
  proteins: "bg-[rgba(167,243,208,0.4)] border-[rgba(167,243,208,0.6)]",
  carbs: "bg-[rgba(254,215,170,0.4)] border-[rgba(254,215,170,0.6)]",
  veg: "bg-[rgba(187,247,208,0.4)] border-[rgba(187,247,208,0.6)]",
  fats: "bg-[rgba(254,202,202,0.35)] border-[rgba(254,202,202,0.55)]",
  fruit: "bg-[rgba(252,231,243,0.4)] border-[rgba(252,231,243,0.6)]",
};

export function FoodsListScreen() {
  const { onboardingExtras, profile, targets, actions } = useAppState();
  const diet: FoodDietPref = onboardingExtras.foodDiet ?? "omnivore";
  const unliked = useMemo(
    () => new Set(onboardingExtras.unlikedFoods ?? []),
    [onboardingExtras.unlikedFoods],
  );
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const name = onboardingExtras.name ?? "you";
  const goalIntent = resolveGoalIntent(profile);
  const goal: "cut" | "maintain" | "gain" =
    goalIntent === "lose" ? "cut" : goalIntent === "gain" ? "gain" : "maintain";

  function toggle(itemName: string) {
    const next = new Set(unliked);
    if (next.has(itemName)) {
      next.delete(itemName);
    } else {
      next.add(itemName);
    }
    actions.setOnboardingExtras({ unlikedFoods: [...next] });
  }

  function setDiet(d: FoodDietPref) {
    actions.setOnboardingExtras({ foodDiet: d });
  }

  const counts = useMemo(() => {
    const out: Record<FoodCategory["cat"], { liked: number; total: number }> = {
      proteins: { liked: 0, total: 0 },
      fats: { liked: 0, total: 0 },
      carbs: { liked: 0, total: 0 },
      fruit: { liked: 0, total: 0 },
      veg: { liked: 0, total: 0 },
    };
    for (const g of foodGroups) {
      for (const it of g.items) {
        if (!isFoodAllowed(it, diet)) continue;
        out[g.cat].total += 1;
        if (!unliked.has(it.n)) out[g.cat].liked += 1;
      }
    }
    return out;
  }, [diet, unliked]);

  const totalLiked =
    counts.proteins.liked +
    counts.fats.liked +
    counts.carbs.liked +
    counts.fruit.liked +
    counts.veg.liked;

  const hasCarbish = counts.carbs.liked >= 1 || counts.fruit.liked >= 1;
  const ok =
    counts.proteins.liked >= 1 &&
    hasCarbish &&
    counts.fats.liked >= 1 &&
    counts.veg.liked >= 1;

  const perMealP = Math.round(targets.proteinG / mealsPerDay);
  const dinnerCarbs =
    goal === "cut" ? 0 : Math.round(targets.carbsG / mealsPerDay);
  const otherMealsCarbs =
    mealsPerDay <= 1
      ? targets.carbsG - dinnerCarbs
      : Math.round((targets.carbsG - dinnerCarbs) / Math.max(mealsPerDay - 1, 1));
  const perMealF = Math.round(targets.fatG / mealsPerDay);
  const slots: string[] =
    mealsPerDay === 3
      ? ["Breakfast", "Lunch", "Dinner"]
      : mealsPerDay === 4
        ? ["Breakfast", "Lunch", "Snack", "Dinner"]
        : mealsPerDay === 2
          ? ["Lunch", "Dinner"]
          : ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"];

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-5 pb-32">
        <Link
          href="/you/foods"
          className="inline-flex items-center gap-1 text-sm text-muted"
        >
          <ArrowLeft size={14} aria-hidden /> Back
        </Link>

        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            YOUR FOODS
          </p>
          <h1 className="font-display mt-2 text-[32px] leading-[1.05] text-ink-2">
            Untap anything <span className="text-forest">you don&rsquo;t eat.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Everything&rsquo;s on. Tap to remove what you won&rsquo;t touch.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-forest px-3 py-1.5 text-xs font-medium text-white">
            <Heart size={12} aria-hidden /> {totalLiked} liked
          </span>
        </header>

        <div className="flex flex-wrap gap-1.5">
          {dietChips.map((c) => (
            <button
              key={c.id}
              type="button"
              data-tap
              onClick={() => setDiet(c.id)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur",
                diet === c.id
                  ? "bg-forest text-white border border-forest"
                  : "bg-white/60 text-ink border border-white/85",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <section className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Per-meal portions</span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-forest">
              Tuned for {name} · {profile.currentWeightKg}→{profile.goalWeightKg} kg
            </span>
          </div>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-muted">
                <th className="py-1 text-left font-medium uppercase tracking-[0.12em]"></th>
                <th className="py-1 font-medium uppercase tracking-[0.12em]">🥩 Pro</th>
                <th className="py-1 font-medium uppercase tracking-[0.12em]">🌾 Carb</th>
                <th className="py-1 font-medium uppercase tracking-[0.12em]">🫒 Fat</th>
                <th className="py-1 font-medium uppercase tracking-[0.12em]">🥬 Veg</th>
              </tr>
            </thead>
            <tbody className="numerals">
              {slots.map((s, i) => {
                const isDinner = s === "Dinner";
                const isSnack = s === "Snack";
                if (isSnack) {
                  return (
                    <tr key={`${s}-${i}`}>
                      <td className="py-1 text-left font-medium">{s}</td>
                      <td colSpan={4} className="py-1 text-center text-muted">
                        1 scoop protein (~25g)
                      </td>
                    </tr>
                  );
                }
                const c = isDinner ? dinnerCarbs : otherMealsCarbs;
                const veg = i === 0 ? "1+" : isDinner ? "3+" : "2+";
                return (
                  <tr key={`${s}-${i}`}>
                    <td className="py-1 text-left font-medium">{s}</td>
                    <td className="py-1 text-center font-semibold">{perMealP}g</td>
                    <td className="py-1 text-center font-semibold">{c}g</td>
                    <td className="py-1 text-center font-semibold">{perMealF}g</td>
                    <td className="py-1 text-center font-semibold">{veg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-center text-[10.5px] text-muted">
            Numbers tuned to your weight, goals, and {mealsPerDay}-meal day.
          </p>
        </section>

        {foodGroups.map((g) => {
          const visibleItems = g.items.filter((it) => isFoodAllowed(it, diet));
          if (visibleItems.length === 0) return null;
          return (
            <section key={g.cat} className="space-y-2">
              <div
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3",
                  bannerTone[g.cat],
                )}
              >
                <span className="text-3xl leading-none">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg text-ink-2">{g.name}</h2>
                  <p className="text-xs text-muted">{g.sub}</p>
                </div>
                <span className="text-xs font-semibold text-forest">
                  {counts[g.cat].liked} / {counts[g.cat].total}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {visibleItems.map((it) => (
                  <FoodCard
                    key={it.n}
                    item={it}
                    liked={!unliked.has(it.n)}
                    onToggle={() => toggle(it.n)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl">
          <h3 className="text-sm font-semibold">Free anytime, any amount</h3>
          <FreeGroup
            label="Condiments"
            items={[
              "Mustard",
              "Soy sauce",
              "Lemon juice",
              "Balsamic / apple cider vinegar",
              "Hot sauces",
            ]}
          />
          <FreeGroup
            label="Spices"
            items={["Dry herbs & spices", "Dry seasoning", "Dry rubs", "Salt", "Pepper"]}
          />
          <FreeGroup
            label="Drinks"
            items={[
              "Water",
              "Green tea",
              "Black coffee",
              "Zero-sugar drinks (limit)",
              "Sparkling water",
            ]}
          />
        </section>

        <p className="text-center text-xs text-muted">
          Tip: condiments &amp; spices with 0 calories are always free.
        </p>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-hairline bg-white/90 px-4 py-3 backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{totalLiked} foods liked</div>
          <div className="text-xs text-muted">
            {ok
              ? "Builds 7 days from your foods"
              : "Pick at least 1 protein + carb/fruit + fat + veg"}
          </div>
        </div>
        <Link
          href="/you/foods/week"
          aria-disabled={!ok}
          tabIndex={ok ? 0 : -1}
          onClick={(e) => {
            if (!ok) e.preventDefault();
          }}
          data-tap
          className={clsx(
            "tap-bounce inline-flex h-11 items-center rounded-full px-5 text-sm font-medium",
            ok ? "bg-forest text-white" : "bg-stone-2 text-faint pointer-events-none",
          )}
        >
          Generate week
        </Link>
      </div>
    </LockedState>
  );
}

function FoodCard({
  item,
  liked,
  onToggle,
}: {
  item: FoodItem;
  liked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-tap
      onClick={onToggle}
      className={clsx(
        "tap-bounce relative rounded-2xl border-2 px-2 py-3 text-center backdrop-blur-xl transition",
        liked ? "bg-forest/10 border-forest" : "bg-white/65 border-white/85",
      )}
    >
      <span
        className={clsx(
          "absolute right-1.5 top-1 text-[13px] transition",
          liked ? "opacity-100 scale-110" : "opacity-20",
        )}
      >
        ❤️
      </span>
      <span className="block text-2xl leading-none">{item.e}</span>
      <span className="mt-1.5 block text-xs font-medium leading-tight">
        {item.n}
      </span>
    </button>
  );
}

function FreeGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <>
      <div className="mt-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className="rounded-full bg-forest/10 px-2.5 py-1 text-[11.5px] font-medium text-forest"
          >
            {it}
          </span>
        ))}
      </div>
    </>
  );
}
