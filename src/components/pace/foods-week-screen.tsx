"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
  Shuffle,
  Sparkles,
  Utensils,
} from "lucide-react";
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

function mealSlotsFor(mealsPerDay: number): string[] {
  if (mealsPerDay <= 2) return ["Breakfast", "Dinner"];
  if (mealsPerDay >= 5) return ["Breakfast", "Mid-morning", "Lunch", "Afternoon", "Dinner"];
  if (mealsPerDay === 4) return ["Breakfast", "Lunch", "Snack", "Dinner"];
  return ["Breakfast", "Lunch", "Dinner"];
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pickRecipeKey(
  shift: number,
  dayIdx: number,
  slotIdx: number,
  banned: Set<string>,
): string {
  const candidates = recipeKeys.filter((k) => !banned.has(k));
  const list = candidates.length > 0 ? candidates : recipeKeys;
  return list[(dayIdx + shift + slotIdx * 2) % list.length];
}

function makeDays(
  weekIdx: number,
  shift: number,
  slots: string[],
  banned: Set<string>,
  overrides: Record<string, string>,
): DayPlan[] {
  return dayNames.map((n, dayIdx) => ({
    name: n,
    meals: slots.map((_, slotIdx) => {
      const positionKey = `${weekIdx}|${dayIdx}|${slotIdx}`;
      const overridden = overrides[positionKey];
      const key =
        overridden && !banned.has(overridden) && recipes[overridden]
          ? overridden
          : pickRecipeKey(shift, dayIdx, slotIdx, banned);
      return { key };
    }),
  }));
}

function buildWeeks(
  seed: number,
  slots: string[],
  banned: Set<string>,
  overrides: Record<string, string>,
): WeekPlan[] {
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
      days: makeDays(0, seed, slots, banned, overrides),
      showShop: true,
    },
    {
      name: "This week",
      range: `${fmt(cur)} – ${fmt(curEnd)}`,
      badge: "Current",
      badgeClass: "this-week",
      days: makeDays(1, seed + 1, slots, banned, overrides),
      showShop: true,
    },
    {
      name: "Next week",
      range: `${fmt(next)} – ${fmt(nextEnd)}`,
      badge: "Planned",
      badgeClass: "future",
      days: makeDays(2, seed + 3, slots, banned, overrides),
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
  const { onboardingExtras, actions } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const [planSeed, setPlanSeed] = useState(0);
  const [mealCountOpen, setMealCountOpen] = useState(false);
  const slots = useMemo(() => mealSlotsFor(mealsPerDay), [mealsPerDay]);
  const banned = useMemo(
    () => new Set(onboardingExtras.bannedRecipes ?? []),
    [onboardingExtras.bannedRecipes],
  );
  const overrides = useMemo(
    () => onboardingExtras.weekSwaps ?? {},
    [onboardingExtras.weekSwaps],
  );
  const weeks = useMemo(
    () => buildWeeks(planSeed, slots, banned, overrides),
    [planSeed, slots, banned, overrides],
  );
  const [weekIndex, setWeekIndex] = useState<number>(1);
  const [openRecipe, setOpenRecipe] = useState<{
    day: string;
    slot: string;
    key: string;
    recipe: Recipe;
    dayIdx: number;
    slotIdx: number;
  } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{
    day: string;
    slot: string;
    currentKey: string;
    dayIdx: number;
    slotIdx: number;
  } | null>(null);

  const week = weeks[weekIndex];
  const todayWeekday = new Date().getDay() || 7; // 1..7 (Mon..Sun)
  const todayIdx = todayWeekday - 1;

  function step(dir: number) {
    setWeekIndex((i) => Math.min(weeks.length - 1, Math.max(0, i + dir)));
  }

  function tapMeal(
    day: string,
    slot: string,
    key: string,
    dayIdx: number,
    slotIdx: number,
  ) {
    const recipe = recipes[key];
    if (!recipe) return;
    setOpenRecipe({ day, slot, key, recipe, dayIdx, slotIdx });
  }

  function applySwap(dayIdx: number, slotIdx: number, newKey: string) {
    const positionKey = `${weekIndex}|${dayIdx}|${slotIdx}`;
    const next = { ...overrides, [positionKey]: newKey };
    actions.setOnboardingExtras({ weekSwaps: next });
  }

  function banRecipe(key: string) {
    const nextBanned = Array.from(new Set([...(onboardingExtras.bannedRecipes ?? []), key]));
    // Drop any overrides that pointed at this banned recipe so they re-pick.
    const cleaned: Record<string, string> = {};
    for (const [pos, val] of Object.entries(overrides)) {
      if (val !== key) cleaned[pos] = val;
    }
    actions.setOnboardingExtras({
      bannedRecipes: nextBanned,
      weekSwaps: cleaned,
    });
  }

  function setMealsPerDay(nextMealsPerDay: number) {
    actions.setOnboardingExtras({
      routine: {
        ...onboardingExtras.routine,
        mealsPerDay: nextMealsPerDay,
      },
    });
    setMealCountOpen(false);
  }

  if (!onboardingExtras.weekGenerated) {
    return (
      <LockedState feature="nutrition-guide">
        <GenerateWeek
          name={onboardingExtras.name}
          mealsPerDay={mealsPerDay}
          likedCount={Math.max(
            recipeKeys.length - (onboardingExtras.bannedRecipes?.length ?? 0),
            0,
          )}
          onDone={() => actions.setOnboardingExtras({ weekGenerated: true })}
        />
      </LockedState>
    );
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
          <button
            type="button"
            data-tap
            onClick={() => setMealCountOpen(true)}
            aria-haspopup="dialog"
            className="tap-bounce inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"
            aria-label="Change meals per day"
          >
            <Utensils size={12} aria-hidden /> {mealsPerDay}/day
          </button>
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
                <span className="text-xs text-muted">{d.meals.length} meals</span>
              </div>
              <div className="space-y-2">
                {d.meals.map((m, mi) => (
                  <div
                    key={`${d.name}-${mi}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-3 py-2.5"
                  >
                    <button
                      type="button"
                      data-tap
                      onClick={() => tapMeal(d.name, slots[mi], m.key, i, mi)}
                      className="tap-bounce flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="text-2xl leading-none">{mealIcoFor(m.key)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
                          {slots[mi]}
                        </div>
                        <div className="truncate text-sm font-medium">{m.key}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      data-tap
                      onClick={() =>
                        setSwapTarget({
                          day: d.name,
                          slot: slots[mi],
                          currentKey: m.key,
                          dayIdx: i,
                          slotIdx: mi,
                        })
                      }
                      aria-label={`Swap ${m.key}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-white text-muted hover:text-ink"
                    >
                      <Shuffle size={14} aria-hidden />
                    </button>
                  </div>
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
          onClick={() => setPlanSeed((seed) => seed + 1)}
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
          onSwap={() => {
            setSwapTarget({
              day: openRecipe.day,
              slot: openRecipe.slot,
              currentKey: openRecipe.key,
              dayIdx: openRecipe.dayIdx,
              slotIdx: openRecipe.slotIdx,
            });
            setOpenRecipe(null);
          }}
          onBan={() => {
            banRecipe(openRecipe.key);
            setOpenRecipe(null);
          }}
        />
      ) : null}

      {swapTarget ? (
        <SwapSheet
          day={swapTarget.day}
          slot={swapTarget.slot}
          currentKey={swapTarget.currentKey}
          banned={banned}
          onPick={(newKey) => {
            applySwap(swapTarget.dayIdx, swapTarget.slotIdx, newKey);
            setSwapTarget(null);
          }}
          onBan={(key) => banRecipe(key)}
          onClose={() => setSwapTarget(null)}
        />
      ) : null}

      {mealCountOpen ? (
        <MealCountSheet
          value={mealsPerDay}
          onSelect={setMealsPerDay}
          onClose={() => setMealCountOpen(false)}
        />
      ) : null}
    </LockedState>
  );
}

const mealCountOptions = [
  { value: 2, label: "2/day", detail: "Breakfast + dinner" },
  { value: 3, label: "3/day", detail: "Breakfast, lunch, dinner" },
  { value: 4, label: "4/day", detail: "Adds a snack" },
  { value: 5, label: "5/day", detail: "Two smaller snacks" },
] as const;

function MealCountSheet({
  value,
  onSelect,
  onClose,
}: {
  value: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close meal count picker"
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Meals per day"
        className="sheet-anim relative mx-auto w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pt-3 shadow-elevated"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-2" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink-2">Meals per day</h3>
            <p className="mt-0.5 text-xs text-muted">Updates this week&apos;s meal slots.</p>
          </div>
          <Utensils size={20} className="text-forest" aria-hidden />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {mealCountOptions.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                data-tap
                onClick={() => onSelect(option.value)}
                className={clsx(
                  "tap-bounce min-h-[78px] rounded-2xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-forest bg-forest text-white shadow-sm"
                    : "border-hairline bg-paper text-ink",
                )}
                aria-pressed={selected}
              >
                <span className="block text-lg font-semibold numerals">{option.label}</span>
                <span className={clsx("mt-1 block text-xs", selected ? "text-white/80" : "text-muted")}>
                  {option.detail}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-tap
          onClick={onClose}
          className="tap-bounce mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-stone-2 bg-paper text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function RecipeSheet({
  day,
  slot,
  name,
  recipe,
  onClose,
  onSwap,
  onBan,
}: {
  day: string;
  slot: string;
  name: string;
  recipe: Recipe;
  onClose: () => void;
  onSwap: () => void;
  onBan: () => void;
}) {
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  }

  function endDrag() {
    const shouldClose = dragY > 84;
    dragStartY.current = null;
    setDragY(0);
    if (shouldClose) onClose();
  }

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
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
          transform: dragY ? `translateY(${dragY}px)` : undefined,
        }}
      >
        <div
          className="mx-auto mb-3 flex h-7 w-24 touch-none cursor-grab items-start justify-center pt-2 active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Swipe down to close"
        >
          <div className="h-1 w-10 rounded-full bg-stone-2" />
        </div>
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            data-tap
            onClick={onSwap}
            className="tap-bounce inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-stone-2 bg-paper text-xs"
          >
            <Shuffle size={14} aria-hidden /> Swap
          </button>
          <button
            type="button"
            data-tap
            onClick={onBan}
            className="tap-bounce inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-stone-2 bg-paper text-xs"
          >
            <Ban size={14} aria-hidden /> Don&rsquo;t suggest
          </button>
          <button
            type="button"
            data-tap
            onClick={onClose}
            className="tap-bounce inline-flex h-11 items-center justify-center rounded-full bg-forest text-xs font-medium text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SwapSheet({
  day,
  slot,
  currentKey,
  banned,
  onPick,
  onBan,
  onClose,
}: {
  day: string;
  slot: string;
  currentKey: string;
  banned: Set<string>;
  onPick: (newKey: string) => void;
  onBan: (key: string) => void;
  onClose: () => void;
}) {
  const alternatives = recipeKeys.filter(
    (k) => k !== currentKey && !banned.has(k),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close swap"
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="sheet-anim relative mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 shadow-elevated"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-2" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink-2">Swap meal</h3>
            <p className="text-xs text-muted">
              {day} · {slot} · replacing <span className="font-medium text-ink">{currentKey}</span>
            </p>
          </div>
          <Shuffle size={20} className="text-forest" aria-hidden />
        </div>

        <button
          type="button"
          data-tap
          onClick={() => {
            onBan(currentKey);
            onClose();
          }}
          className="tap-bounce mt-4 inline-flex w-full items-center gap-2 rounded-2xl border border-clay/30 bg-clay/5 px-3 py-2.5 text-left text-sm text-clay"
        >
          <Ban size={14} aria-hidden />
          <span className="flex-1">Don&rsquo;t suggest &ldquo;{currentKey}&rdquo; again</span>
        </button>

        <div className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Pick an alternative
        </div>

        {alternatives.length === 0 ? (
          <p className="rounded-2xl border border-hairline bg-paper px-4 py-6 text-center text-sm text-muted">
            No more alternatives. Unban a meal in &ldquo;Edit foods&rdquo; or add new recipes to your list.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {alternatives.map((key) => {
              const r = recipes[key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-2xl border border-hairline bg-white px-3 py-2"
                >
                  <button
                    type="button"
                    data-tap
                    onClick={() => onPick(key)}
                    className="tap-bounce flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-2xl leading-none">{mealIcoFor(key)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{key}</div>
                      <div className="text-[11px] text-muted">
                        {r ? `${r.kcal} kcal · ${r.p}g protein · ${r.time}` : "—"}
                      </div>
                    </div>
                    <Check size={14} className="text-forest opacity-0" aria-hidden />
                  </button>
                  <button
                    type="button"
                    data-tap
                    onClick={() => onBan(key)}
                    aria-label={`Don't suggest ${key}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-paper text-muted hover:text-clay"
                  >
                    <Ban size={13} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          data-tap
          onClick={onClose}
          className="tap-bounce mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-stone-2 bg-paper text-sm"
        >
          Cancel
        </button>
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

const generateSteps = [
  "Reading your foods…",
  "Balancing protein, carbs &amp; fat…",
  "Rotating meals across the week…",
  "Wrapping up your plan…",
];

function GenerateWeek({
  name,
  mealsPerDay,
  likedCount,
  onDone,
}: {
  name: string | undefined;
  mealsPerDay: number;
  likedCount: number;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "running">("idle");
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (phase !== "running") return;
    const stepDuration = 500;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < generateSteps.length; i++) {
      timers.push(
        setTimeout(() => setStepIdx(i), i * stepDuration),
      );
    }
    timers.push(
      setTimeout(() => onDone(), generateSteps.length * stepDuration + 200),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [phase, onDone]);

  return (
    <div className="stagger-up space-y-4 pb-32">
      <Link
        href="/you/foods"
        className="inline-flex items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft size={14} aria-hidden /> Back
      </Link>

      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOUR WEEK
        </p>
        <h1 className="font-display mt-1 text-[34px] leading-[1.05] text-ink-2">
          {phase === "running" ? (
            <>
              Building your <span className="text-forest">week…</span>
            </>
          ) : (
            <>
              Ready when <span className="text-forest">you are.</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {phase === "running"
            ? "Hang tight — we're tailoring this to you."
            : `Hi ${name ?? "there"} — let's spin up a 7-day plan from your foods.`}
        </p>
      </header>

      <div className="rounded-3xl border border-white/85 bg-white/55 p-5 shadow-card backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
              phase === "running"
                ? "animate-pulse bg-forest text-white"
                : "bg-forest/10 text-forest",
            )}
          >
            <Sparkles size={22} aria-hidden />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Personalised plan
            </div>
            <div className="font-display text-lg text-ink-2">
              {mealsPerDay} meals/day · {likedCount} recipes
            </div>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {generateSteps.map((s, i) => {
            const done = phase === "running" && i < stepIdx;
            const active = phase === "running" && i === stepIdx;
            const pending = phase === "idle" || (!done && !active);
            return (
              <li
                key={i}
                className={clsx(
                  "flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-sm transition",
                  done && "border-forest/20 bg-forest/[0.06] text-ink",
                  active && "border-forest bg-white text-ink-2",
                  pending && "border-hairline bg-white/40 text-faint",
                )}
              >
                <span
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold",
                    done && "bg-forest text-white",
                    active && "animate-pulse bg-forest/15 text-forest",
                    pending && "bg-stone-2 text-muted",
                  )}
                >
                  {done ? <Check size={12} aria-hidden /> : i + 1}
                </span>
                <span
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: s }}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-3xl border border-white/85 bg-white/55 px-4 py-3 text-xs text-muted backdrop-blur-xl">
        We rotate breakfast, lunch &amp; dinner across the week and balance kcal,
        protein, carbs and fats to your targets. You can swap or ban any meal
        afterwards.
      </div>

      <button
        type="button"
        data-tap
        onClick={() => {
          if (phase === "idle") {
            setStepIdx(0);
            setPhase("running");
          }
        }}
        disabled={phase === "running"}
        className={clsx(
          "tap-bounce inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium shadow-elevated transition",
          phase === "running"
            ? "cursor-not-allowed bg-forest/70 text-white"
            : "cta-glow bg-forest text-white",
        )}
      >
        {phase === "running" ? (
          <>
            <Sparkles size={16} className="animate-pulse" aria-hidden />
            Generating…
          </>
        ) : (
          <>
            <Sparkles size={16} aria-hidden />
            Generate my week
          </>
        )}
      </button>
    </div>
  );
}
