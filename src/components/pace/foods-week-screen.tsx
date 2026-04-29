"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, RefreshCw, Utensils } from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { LockedState } from "./paywall-sheet";
import { mealIcoFor, recipeKeys, recipes, type Recipe } from "./foods/food-data";

interface DayPlan {
  name: string;
  meals: { key: string }[];
}

interface WeekPlan {
  name: string;
  range: string;
  badge: string;
  badgeClass: "this-week" | "future" | "past";
  days: DayPlan[];
  showShop: boolean;
}

function weekStart(offsetWeeks: number): Date {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1) + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(d);
}

function makeDays(seed: number): DayPlan[] {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return dayNames.map((n, i) => ({
    name: n,
    meals: [
      { key: recipeKeys[(i + seed) % recipeKeys.length] },
      { key: recipeKeys[(i + seed + 2) % recipeKeys.length] },
      { key: recipeKeys[(i + seed + 4) % recipeKeys.length] },
    ],
  }));
}

function buildWeeks(): WeekPlan[] {
  const last = weekStart(-1);
  const lastEnd = new Date(last);
  lastEnd.setDate(lastEnd.getDate() + 6);
  const cur = weekStart(0);
  const curEnd = new Date(cur);
  curEnd.setDate(curEnd.getDate() + 6);
  const next = weekStart(1);
  const nextEnd = new Date(next);
  nextEnd.setDate(nextEnd.getDate() + 6);

  return [
    {
      name: "Last week",
      range: `${fmt(last)} – ${fmt(lastEnd)}`,
      badge: "Past",
      badgeClass: "past",
      days: makeDays(0),
      showShop: true,
    },
    {
      name: "This week",
      range: `${fmt(cur)} – ${fmt(curEnd)}`,
      badge: "Current",
      badgeClass: "this-week",
      days: makeDays(1),
      showShop: true,
    },
    {
      name: "Next week",
      range: `${fmt(next)} – ${fmt(nextEnd)}`,
      badge: "Planned",
      badgeClass: "future",
      days: makeDays(3),
      showShop: false,
    },
  ];
}

const badgeTone: Record<WeekPlan["badgeClass"], string> = {
  "this-week": "bg-forest/15 text-forest",
  future: "bg-sky/15 text-sky",
  past: "bg-ink/5 text-muted",
};

export function FoodsWeekScreen() {
  const { onboardingExtras } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const weeks = useMemo(buildWeeks, []);
  const [weekIndex, setWeekIndex] = useState<number>(1);
  const [openRecipe, setOpenRecipe] = useState<{
    day: string;
    slot: string;
    key: string;
    recipe: Recipe;
  } | null>(null);

  const week = weeks[weekIndex];
  const todayWeekday = new Date().getDay() || 7; // 1..7 (Mon..Sun)
  const todayIdx = todayWeekday - 1;

  const slots = ["Breakfast", "Lunch", "Dinner"];

  function step(dir: number) {
    setWeekIndex((i) => Math.min(weeks.length - 1, Math.max(0, i + dir)));
  }

  function tapMeal(day: string, slot: string, key: string) {
    const recipe = recipes[key];
    if (!recipe) return;
    setOpenRecipe({ day, slot, key, recipe });
  }

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-4 pb-32">
        <Link
          href="/you/foods"
          className="inline-flex items-center gap-1 text-sm text-muted"
        >
          <ArrowLeft size={14} aria-hidden /> Back
        </Link>

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
              YOUR WEEK
            </p>
            <h1 className="font-display mt-1 text-[32px] leading-[1.05] text-ink-2">
              {week.name === "This week" ? (
                <>
                  This <span className="text-forest">week.</span>
                </>
              ) : (
                week.name
              )}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm">
            <Utensils size={12} aria-hidden /> {mealsPerDay}/day
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/85 bg-white/55 px-3 py-2.5 backdrop-blur-xl">
          <button
            type="button"
            data-tap
            onClick={() => step(-1)}
            disabled={weekIndex === 0}
            className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-white text-ink disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold">{week.name}</div>
            <div className="text-xs text-muted">{week.range}</div>
            <span
              className={clsx(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                badgeTone[week.badgeClass],
              )}
            >
              {week.badge}
            </span>
          </div>
          <button
            type="button"
            data-tap
            onClick={() => step(1)}
            disabled={weekIndex === weeks.length - 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-white text-ink disabled:opacity-30"
            aria-label="Next week"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>

        {week.days.map((d, i) => {
          const isToday = weekIndex === 1 && i === todayIdx;
          return (
            <article
              key={d.name}
              className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{d.name}</span>
                  {isToday ? (
                    <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
                      Today
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted">{slots.length} meals</span>
              </div>
              <div className="space-y-2">
                {d.meals.map((m, mi) => (
                  <button
                    key={`${d.name}-${mi}`}
                    type="button"
                    data-tap
                    onClick={() => tapMeal(d.name, slots[mi], m.key)}
                    className="tap-bounce flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-3 py-2.5 text-left"
                  >
                    <span className="text-2xl leading-none">{mealIcoFor(m.key)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
                        {slots[mi]}
                      </div>
                      <div className="text-sm font-medium">{m.key}</div>
                    </div>
                    <span className="text-xs text-forest">Recipe ›</span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}

        {!week.showShop ? (
          <div className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl">
            <div className="text-sm font-semibold">Plan ahead</div>
            <p className="mt-1 text-xs text-muted">
              Lock in next week now, or wait — it&rsquo;ll auto-build on Sunday.
            </p>
          </div>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-2 border-t border-hairline bg-white/90 px-4 py-3 backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <button
          type="button"
          data-tap
          onClick={() => window.print()}
          className="tap-bounce inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-2 bg-paper text-xs"
        >
          <Printer size={14} aria-hidden /> PDF
        </button>
        <button
          type="button"
          data-tap
          onClick={() => setWeekIndex((i) => i)}
          className="tap-bounce inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-2 bg-paper text-xs"
        >
          <RefreshCw size={14} aria-hidden /> Re-roll
        </button>
        <Link
          href="/you/foods/list"
          data-tap
          className="tap-bounce inline-flex h-10 flex-1 items-center justify-center rounded-full bg-forest text-xs font-medium text-white"
        >
          Edit foods
        </Link>
      </div>

      {openRecipe ? (
        <RecipeSheet
          day={openRecipe.day}
          slot={openRecipe.slot}
          name={openRecipe.key}
          recipe={openRecipe.recipe}
          onClose={() => setOpenRecipe(null)}
        />
      ) : null}
    </LockedState>
  );
}

function RecipeSheet({
  day,
  slot,
  name,
  recipe,
  onClose,
}: {
  day: string;
  slot: string;
  name: string;
  recipe: Recipe;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="sheet-anim relative mx-auto max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 shadow-elevated"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-2" />
        <div className="flex items-center gap-3">
          <span className="text-[44px] leading-none">{mealIcoFor(name)}</span>
          <div>
            <h3 className="font-display text-2xl text-ink-2">{name}</h3>
            <p className="text-xs text-muted">
              {day} · {slot} · {recipe.time}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat label="Kcal" value={recipe.kcal} />
          <Stat label="Protein" value={`${recipe.p}g`} />
          <Stat label="Carbs" value={`${recipe.c}g`} />
          <Stat label="Fats" value={`${recipe.f}g`} />
        </div>

        <SectionTitle>Ingredients</SectionTitle>
        <div className="space-y-1.5">
          {recipe.ingredients.map((i) => (
            <div
              key={i.n}
              className="flex items-center gap-2.5 rounded-2xl border border-hairline bg-white/70 px-3 py-2 text-sm"
            >
              <span className="text-lg">{i.e}</span>
              <span className="flex-1">{i.n}</span>
              <span className="text-xs font-semibold text-forest numerals">{i.q}</span>
            </div>
          ))}
        </div>

        <SectionTitle>How to make it</SectionTitle>
        <ol className="space-y-0">
          {recipe.steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 border-b border-hairline py-2.5 text-sm last:border-b-0"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold text-forest numerals">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            data-tap
            onClick={onClose}
            className="tap-bounce inline-flex h-11 flex-1 items-center justify-center rounded-full border border-stone-2 bg-paper text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-forest/15 bg-forest/[0.06] px-2 py-2 text-center">
      <div className="text-base font-semibold numerals">{value}</div>
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
      {children}
    </div>
  );
}
