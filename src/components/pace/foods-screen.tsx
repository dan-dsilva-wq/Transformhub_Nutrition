"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  RefreshCw,
  Shuffle,
  ShoppingBag,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import type { DailyTargets } from "@/lib/targets";
import type { DietaryPref } from "@/lib/state/types";
import { LockedState } from "./paywall-sheet";
import {
  recipeKeys,
  recipes,
  type Recipe,
} from "./foods/food-data";
import { RecipeIcon } from "./foods/recipe-icon";
import {
  dayPlannedNutrition,
  ingredientMatchesSkip,
  mealSlotsFor,
  pickRecipeKey,
  plannedNutritionForRecipe,
  recipeAllowedForPreferences,
  recipeFitsSlot,
  rotatedDayNames,
  weekStartFromToday,
} from "./foods/planning";
import { DEFAULT_PANTRY } from "./foods/shopping";
import { trackTesterEvent } from "@/lib/tester/track";
import { AmbientDrift, RecipeSteam, TiltCard } from "./personality";

interface DayPlan {
  name: string;
  meals: { key: string }[];
}

interface WeekPlan {
  name: string;
  range: string;
  badge: string;
  badgeClass: "this-week" | "future";
  days: DayPlan[];
  showShop: boolean;
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(d);
}

const dayNames = rotatedDayNames();

const chapterMoods: { title: string; tint: string; sub: string }[] = [
  { title: "Reset Monday", tint: "linear-gradient(160deg,#a7f3d0,#dff5e8)", sub: "Bright greens, lean protein, no fuss." },
  { title: "Easy Tuesday", tint: "linear-gradient(160deg,#bae6fd,#e6f4fc)", sub: "Quick wins. Nothing more than 20 minutes." },
  { title: "Steady Wednesday", tint: "linear-gradient(160deg,#fde1c4,#fff3e1)", sub: "A solid mid-week plate." },
  { title: "Bright Thursday", tint: "linear-gradient(160deg,#f6c8c0,#fde7e3)", sub: "Bigger flavours, lighter feel." },
  { title: "Office Friday", tint: "linear-gradient(160deg,#e0e8f5,#f4f7fb)", sub: "Built around what's already in the fridge." },
  { title: "Slow Saturday", tint: "linear-gradient(160deg,#f6e2bd,#fcf2d8)", sub: "A hands-on day worth the apron." },
  { title: "Sunday roast", tint: "linear-gradient(160deg,#dff5e8,#cfe9ff)", sub: "Cook once, eat twice." },
];

const TODAY_HERO_TITLE = "Today is the one";
const TODAY_HERO_SUB = "Cook this. The rest of the week can wait.";

function makeDays(
  weekIdx: number,
  shift: number,
  slots: string[],
  banned: Set<string>,
  skipped: string[],
  dietaryPreferences: DietaryPref[],
  overrides: Record<string, string>,
): DayPlan[] {
  return dayNames.map((n, dayIdx) => {
    const usedToday = new Set<string>();
    const meals = slots.map((_, slotIdx) => {
      const positionKey = `${weekIdx}|${dayIdx}|${slotIdx}`;
      const overridden = overrides[positionKey];
      const useOverride =
        overridden &&
        !banned.has(overridden) &&
        recipes[overridden] &&
        recipeFitsSlot(overridden, recipes[overridden], slots[slotIdx] ?? "") &&
        recipeAllowedForPreferences(overridden, recipes[overridden], dietaryPreferences, skipped);
      const key = useOverride
        ? (overridden as string)
        : pickRecipeKey(shift, dayIdx, slotIdx, banned, skipped, dietaryPreferences, slots[slotIdx] ?? "", usedToday);
      usedToday.add(key);
      return { key };
    });
    return { name: n, meals };
  });
}

const MAX_WEEKS_AHEAD = 4;

function buildWeeks(
  seed: number,
  slots: string[],
  banned: Set<string>,
  skipped: string[],
  dietaryPreferences: DietaryPref[],
  overrides: Record<string, string>,
  weeksAhead: number,
): WeekPlan[] {
  const total = 1 + Math.max(0, Math.min(MAX_WEEKS_AHEAD, weeksAhead));
  const out: WeekPlan[] = [];
  for (let i = 0; i < total; i++) {
    const start = weekStartFromToday(i);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    out.push({
      name: i === 0 ? "This week" : i === 1 ? "Next week" : `In ${i} weeks`,
      range: `${fmt(start)} - ${fmt(end)}`,
      badge: i === 0 ? "Current" : "Planned",
      badgeClass: i === 0 ? "this-week" : "future",
      days: makeDays(i, seed + i * 2, slots, banned, skipped, dietaryPreferences, overrides),
      showShop: true,
    });
  }
  return out;
}

const badgeTone: Record<WeekPlan["badgeClass"], string> = {
  "this-week": "bg-forest text-white",
  future: "bg-sky-200 text-sky-900",
};

function totalDayMinutes(day: DayPlan): number {
  let m = 0;
  for (const meal of day.meals) {
    const r = recipes[meal.key];
    if (!r) continue;
    const match = r.time.match(/(\d+)/);
    if (match) m += parseInt(match[1], 10);
  }
  return m;
}

export function FoodsScreen() {
  const { onboardingExtras, targets, actions } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const planSeed = onboardingExtras.weekPlanSeed ?? 0;
  const [mealCountOpen, setMealCountOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(
    !onboardingExtras.hasSeenWeekIntro,
  );

  const slots = useMemo(() => mealSlotsFor(mealsPerDay), [mealsPerDay]);
  const banned = useMemo(
    () => new Set(onboardingExtras.bannedRecipes ?? []),
    [onboardingExtras.bannedRecipes],
  );
  const skipped = useMemo(
    () => onboardingExtras.skippedIngredients ?? [],
    [onboardingExtras.skippedIngredients],
  );
  const dietaryPreferences = useMemo(
    () => onboardingExtras.dietaryPreferences ?? [],
    [onboardingExtras.dietaryPreferences],
  );
  const overrides = useMemo(
    () => onboardingExtras.weekSwaps ?? {},
    [onboardingExtras.weekSwaps],
  );
  const weeksAhead = Math.max(
    0,
    Math.min(MAX_WEEKS_AHEAD, onboardingExtras.weeksAhead ?? 0),
  );
  const weeks = useMemo(
    () => buildWeeks(planSeed, slots, banned, skipped, dietaryPreferences, overrides, weeksAhead),
    [planSeed, slots, banned, skipped, dietaryPreferences, overrides, weeksAhead],
  );
  const [weekIndex, setWeekIndex] = useState<number>(0);
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
  const [skipTarget, setSkipTarget] = useState<{
    name: string;
    emoji: string;
  } | null>(null);

  const week = weeks[weekIndex];
  const todayIdx = 0;
  const isLastWeek = weekIndex === weeks.length - 1;
  const canGenerateMore = weeksAhead < MAX_WEEKS_AHEAD;
  const [generating, setGenerating] = useState<null | "next" | "reroll">(null);
  function generateNextWeek() {
    if (!canGenerateMore || generating) return;
    setGenerating("next");
    setTimeout(() => {
      actions.setOnboardingExtras({ weeksAhead: weeksAhead + 1 });
      setWeekIndex((i) => i + 1);
      setGenerating(null);
    }, 1800);
  }
  function rerollWeek() {
    if (generating) return;
    setGenerating("reroll");
    setTimeout(() => {
      actions.setOnboardingExtras({
        weekPlanSeed: planSeed + 1,
        shoppingChecked: [],
      });
      setGenerating(null);
    }, 1800);
  }

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
    trackTesterEvent("meal_swapped", { newKey });
  }

  function banRecipe(key: string) {
    const nextBanned = Array.from(
      new Set([...(onboardingExtras.bannedRecipes ?? []), key]),
    );
    const cleaned: Record<string, string> = {};
    for (const [pos, val] of Object.entries(overrides)) {
      if (val !== key) cleaned[pos] = val;
    }
    actions.setOnboardingExtras({
      bannedRecipes: nextBanned,
      weekSwaps: cleaned,
    });
    trackTesterEvent("meal_banned", { recipe: key });
  }

  function skipIngredient(name: string) {
    const next = Array.from(
      new Set([...(onboardingExtras.skippedIngredients ?? []), name]),
    );
    actions.setOnboardingExtras({ skippedIngredients: next });
    trackTesterEvent("ingredient_skipped", { name });
  }

  function addToPantry(name: string) {
    const next = Array.from(
      new Set([...(onboardingExtras.pantryStaples ?? DEFAULT_PANTRY), name]),
    );
    actions.setOnboardingExtras({ pantryStaples: next });
  }

  function setMealsPerDay(nextMealsPerDay: number) {
    actions.setOnboardingExtras({
      routine: { ...onboardingExtras.routine, mealsPerDay: nextMealsPerDay },
    });
    setMealCountOpen(false);
  }

  function dismissIntro() {
    actions.setOnboardingExtras({
      hasSeenWeekIntro: true,
      hasSeenFoodIntro: true,
    });
    setIntroOpen(false);
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
          onDone={() => {
            actions.setOnboardingExtras({
              weekGenerated: true,
              weekPlanSeed: onboardingExtras.weekPlanSeed ?? 0,
            });
            trackTesterEvent("week_generated", { mealsPerDay });
          }}
        />
        {introOpen ? <WalkthroughSheet onClose={dismissIntro} /> : null}
      </LockedState>
    );
  }

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-4 pb-32">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
              YOUR FOOD WEEK
            </p>
            <h1 className="font-display mt-1 text-[34px] leading-[1.04] text-ink-2">
              {week.name === "This week" ? (
                <>
                  This <span className="text-forest">week.</span>
                </>
              ) : (
                week.name
              )}
            </h1>
            <p className="mt-1 text-xs text-muted">{week.range}</p>
          </div>
          <button
            type="button"
            data-tap
            onClick={() => setMealCountOpen(true)}
            aria-haspopup="dialog"
            className="tap-bounce mt-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[11px] font-medium text-ink-2 shadow-sm"
            aria-label="Change meals per day"
          >
            <Utensils size={12} aria-hidden /> {mealsPerDay}/day
          </button>
        </header>

        {week.showShop ? (
          <Link
            href="/you/foods/shopping"
            aria-label="Open shopping list"
            className="tap-bounce flex items-center gap-3 rounded-2xl border border-forest/20 bg-gradient-to-r from-forest/[0.10] to-forest/[0.04] px-3.5 py-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest text-white shadow-sm">
              <ShoppingBag size={16} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-2">Shopping list ready</span>
              <span className="block text-[11px] text-muted">Sorted by aisle · tap to open</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-forest" aria-hidden />
          </Link>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded-3xl border border-white/85 bg-white/55 px-2 py-2 backdrop-blur-xl">
          <button
            type="button"
            data-tap
            onClick={() => step(-1)}
            disabled={weekIndex === 0}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline bg-white text-ink disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <div className="flex flex-1 items-center justify-center gap-2">
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
                badgeTone[week.badgeClass],
              )}
            >
              {week.badge}
            </span>
            <button
              type="button"
              data-tap
              onClick={rerollWeek}
              disabled={generating !== null}
              className="tap-bounce grid h-7 w-7 place-items-center rounded-full bg-white text-ink-2 shadow-sm disabled:opacity-50"
              aria-label="Re-roll the week"
              title="Re-roll the week"
            >
              <RefreshCw
                size={12}
                aria-hidden
                className={generating === "reroll" ? "animate-spin" : ""}
              />
            </button>
          </div>
          {isLastWeek && canGenerateMore ? (
            <button
              type="button"
              data-tap
              onClick={generateNextWeek}
              disabled={generating !== null}
              className="tap-bounce inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-forest px-3.5 text-xs font-medium text-white shadow-sm disabled:opacity-70"
              aria-label="Generate next week"
            >
              {generating === "next" ? (
                <>
                  <Sparkles size={14} className="animate-pulse" aria-hidden />
                  Generating...
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden /> Generate
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              data-tap
              onClick={() => step(1)}
              disabled={isLastWeek}
              className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-white text-ink disabled:opacity-30"
              aria-label="Next week"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          )}
        </div>

        {week.days.map((d, i) => {
          const isToday = weekIndex === 0 && i === todayIdx;
          const dayDate = new Date(weekStartFromToday(weekIndex));
          dayDate.setDate(dayDate.getDate() + i);
          return (
            <ChapterCard
              key={d.name}
              day={d}
              dayIdx={i}
              chapterIndex={weekIndex * 7 + i}
              slots={slots}
              mealsPerDay={mealsPerDay}
              targets={targets}
              isToday={isToday}
              dateLabel={fmt(dayDate)}
              onMealTap={tapMeal}
            />
          );
        })}

        {week.showShop ? (
          <Link
            href="/you/foods/shopping"
            data-tap
            className="tap-bounce flex items-center gap-3 rounded-3xl bg-ink-2 p-4 text-white shadow-elevated"
            style={{ background: "#18241f" }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">
              🛍️
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                Shopping list
              </p>
              <p className="font-display text-lg leading-tight">
                Built from this week&rsquo;s meals
              </p>
            </div>
            <ChevronRight size={18} aria-hidden className="text-white/70" />
          </Link>
        ) : (
          <div className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl">
            <div className="text-sm font-semibold">Plan ahead</div>
            <p className="mt-1 text-xs text-muted">
              Last week is read-only. Use the arrows to plan ahead or look back.
            </p>
          </div>
        )}

        {skipped.length > 0 ? (
          <div className="rounded-3xl border border-white/85 bg-white/55 p-4 backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Foods you skip
            </p>
            <p className="mt-1 text-sm text-ink">
              We&rsquo;re hiding{" "}
              <span className="font-semibold text-ink-2">{skipped.length}</span>{" "}
              ingredient{skipped.length === 1 ? "" : "s"} from your plan.
            </p>
            <Link
              href="/you/foods/list"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-forest"
            >
              Open food list <ChevronRight size={12} aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>

      {openRecipe ? (
        <RecipeSheet
          day={openRecipe.day}
          slot={openRecipe.slot}
          name={openRecipe.key}
          recipe={openRecipe.recipe}
          slotIdx={openRecipe.slotIdx}
          mealsPerDay={mealsPerDay}
          targets={targets}
          skipped={skipped}
          pantry={onboardingExtras.pantryStaples ?? []}
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
          onIngredientTap={(ing) => {
            setSkipTarget({ name: ing.n, emoji: ing.e });
          }}
        />
      ) : null}

      {swapTarget ? (
        <SwapSheet
          day={swapTarget.day}
          slot={swapTarget.slot}
          currentKey={swapTarget.currentKey}
          banned={banned}
          skipped={skipped}
          dietaryPreferences={dietaryPreferences}
          onPick={(newKey) => {
            applySwap(swapTarget.dayIdx, swapTarget.slotIdx, newKey);
            setSwapTarget(null);
          }}
          onBan={(key) => banRecipe(key)}
          onClose={() => setSwapTarget(null)}
        />
      ) : null}

      {skipTarget ? (
        <IngredientSkipSheet
          name={skipTarget.name}
          emoji={skipTarget.emoji}
          alreadySkipped={skipped.some(
            (s) => s.toLowerCase() === skipTarget.name.toLowerCase(),
          )}
          onClose={() => setSkipTarget(null)}
          onSkip={() => {
            skipIngredient(skipTarget.name);
            setSkipTarget(null);
          }}
          onPantry={() => {
            addToPantry(skipTarget.name);
            setSkipTarget(null);
          }}
        />
      ) : null}

      {mealCountOpen ? (
        <MealCountSheet
          value={mealsPerDay}
          onSelect={setMealsPerDay}
          onClose={() => setMealCountOpen(false)}
        />
      ) : null}

      {introOpen ? <WalkthroughSheet onClose={dismissIntro} /> : null}
    </LockedState>
  );
}

function ChapterCard({
  day,
  dayIdx,
  chapterIndex,
  slots,
  mealsPerDay,
  targets,
  isToday,
  dateLabel,
  onMealTap,
}: {
  day: DayPlan;
  dayIdx: number;
  chapterIndex: number;
  slots: string[];
  mealsPerDay: number;
  targets: DailyTargets;
  isToday: boolean;
  dateLabel: string;
  onMealTap: (
    day: string,
    slot: string,
    key: string,
    dayIdx: number,
    slotIdx: number,
  ) => void;
}) {
  const mood = chapterMoods[chapterIndex % chapterMoods.length];
  const nutrition = dayPlannedNutrition(day, mealsPerDay, targets);
  const minutes = totalDayMinutes(day);
  const title = isToday ? TODAY_HERO_TITLE : mood.title;
  const subtitle = isToday ? TODAY_HERO_SUB : mood.sub;

  return (
    <article
      className={clsx(
        "rounded-3xl shadow-card overflow-hidden",
        isToday ? "shadow-elevated" : "",
      )}
      style={{
        background: isToday
          ? "linear-gradient(160deg,#18241f,#2a4a3c)"
          : mood.tint,
        color: isToday ? "white" : undefined,
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: isToday ? "rgba(255,255,255,.6)" : "var(--muted, #6c7a73)" }}
          >
            Chapter {chapterIndex + 1} · {day.name} · {dateLabel}
            {isToday ? " · today" : ""}
          </p>
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              isToday ? "bg-white/15 text-white" : "bg-black/[.06] text-ink-2",
            )}
          >
            {minutes ? `${minutes} min total` : "easy"}
          </span>
        </div>
        <h3
          className="font-display text-2xl mt-1"
          style={{ color: isToday ? "white" : "var(--ink-2, #18241f)" }}
        >
          {title}
        </h3>
        <p
          className="mt-1 text-xs"
          style={{
            color: isToday ? "rgba(255,255,255,.75)" : "rgba(44,58,51,.7)",
          }}
        >
          {subtitle}
        </p>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {day.meals.slice(0, 3).map((m, mi) => {
            const slotLabel = slots[mi] ?? "";
            const isHero = isToday && mi === day.meals.length - 1;
            return (
              <button
                key={`${day.name}-${mi}`}
                type="button"
                data-tap
                onClick={() => onMealTap(day.name, slotLabel, m.key, dayIdx, mi)}
                className={clsx(
                  "tap-bounce rounded-2xl p-2 text-center transition",
                )}
                style={{
                  background: isToday
                    ? isHero
                      ? "rgba(255,255,255,.18)"
                      : "rgba(255,255,255,.1)"
                    : "rgba(255,255,255,.6)",
                  boxShadow: isHero ? "0 0 0 1px rgba(255,255,255,.3)" : undefined,
                }}
                aria-label={`${slotLabel}: ${m.key}`}
              >
                <div className="flex justify-center">
                  <RecipeIcon recipeKey={m.key} size={40} rounded={12} />
                </div>
                <div
                  className="mt-1 text-[10px] truncate"
                  style={{
                    color: isToday ? "rgba(255,255,255,.75)" : "var(--muted, #6c7a73)",
                  }}
                >
                  {slotLabel}
                </div>
                <div
                  className="mt-0.5 text-[10.5px] font-medium leading-tight line-clamp-2"
                  style={{
                    color: isToday ? "white" : "var(--ink-2, #18241f)",
                  }}
                >
                  {m.key}
                  {isHero ? " ★" : ""}
                </div>
              </button>
            );
          })}
        </div>
        {day.meals.length > 3 ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {day.meals.slice(3).map((m, mi) => {
              const realIdx = mi + 3;
              const slotLabel = slots[realIdx] ?? "";
              return (
                <button
                  key={`${day.name}-extra-${mi}`}
                  type="button"
                  data-tap
                  onClick={() =>
                    onMealTap(day.name, slotLabel, m.key, dayIdx, realIdx)
                  }
                  className="tap-bounce rounded-2xl p-2 text-left"
                  style={{
                    background: isToday
                      ? "rgba(255,255,255,.1)"
                      : "rgba(255,255,255,.6)",
                  }}
                >
                  <div
                    className="text-[10px]"
                    style={{
                      color: isToday ? "rgba(255,255,255,.7)" : "var(--muted, #6c7a73)",
                    }}
                  >
                    {slotLabel}
                  </div>
                  <div
                    className="flex items-center gap-2 text-[11px] font-medium leading-tight"
                    style={{
                      color: isToday ? "white" : "var(--ink-2, #18241f)",
                    }}
                  >
                    <RecipeIcon recipeKey={m.key} size={28} rounded={9} />
                    <span className="min-w-0 truncate">{m.key}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className="mt-3 flex items-center justify-between gap-3 text-[11px]"
          style={{
            color: isToday ? "rgba(255,255,255,.85)" : "rgba(44,58,51,.85)",
          }}
        >
          <span className="numerals">
            ~{nutrition.calories} kcal · {nutrition.proteinG}g P
          </span>
          {(() => {
            const heroIdx = day.meals.length - 1;
            const heroMeal = day.meals[heroIdx];
            const heroSlot = slots[heroIdx] ?? "";
            if (!heroMeal) return null;
            return (
              <button
                type="button"
                data-tap
                onClick={() =>
                  onMealTap(day.name, heroSlot, heroMeal.key, dayIdx, heroIdx)
                }
                className="tap-bounce inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition"
                style={{
                  background: isToday ? "#a7f3d0" : "var(--forest, #1f5f4a)",
                  color: isToday ? "#18241f" : "white",
                }}
                aria-label={
                  isToday
                    ? `Cook now — open ${heroMeal.key}`
                    : `Open ${day.name} — ${heroMeal.key}`
                }
              >
                {isToday ? "Cook now →" : "Open day →"}
              </button>
            );
          })()}
        </div>
      </div>
    </article>
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
            <p className="mt-0.5 text-xs text-muted">
              Updates this week&apos;s meal slots.
            </p>
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
                <span
                  className={clsx(
                    "mt-1 block text-xs",
                    selected ? "text-white/80" : "text-muted",
                  )}
                >
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
  slotIdx,
  mealsPerDay,
  targets,
  skipped,
  pantry,
  onClose,
  onSwap,
  onBan,
  onIngredientTap,
}: {
  day: string;
  slot: string;
  name: string;
  recipe: Recipe;
  slotIdx: number;
  mealsPerDay: number;
  targets: DailyTargets;
  skipped: string[];
  pantry: string[];
  onClose: () => void;
  onSwap: () => void;
  onBan: () => void;
  onIngredientTap: (ing: { n: string; e: string }) => void;
}) {
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const pantrySet = new Set(pantry.map((p) => p.toLowerCase()));
  const planned = plannedNutritionForRecipe(recipe, slotIdx, mealsPerDay, targets);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStartY.current));
  }

  function endDrag() {
    const shouldClose = dragY > 60;
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
        className="sheet-anim relative mx-auto flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-white shadow-elevated"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
        }}
      >
        <div
          className="flex h-10 w-full touch-none cursor-grab items-center justify-center active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Swipe down to close"
        >
          <div className="h-1.5 w-12 rounded-full bg-stone-2" />
        </div>
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 pt-1"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
        >
        <TiltCard
          intensity={8}
          className="overflow-hidden rounded-2xl p-4"
          style={{
            background:
              "linear-gradient(135deg,#fde68a,#fdba74 60%,#f87171)",
            color: "#1d2a22",
            boxShadow: "0 18px 40px rgba(244,114,82,0.28)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="relative inline-block shrink-0" aria-hidden>
              <RecipeIcon recipeKey={name} size={64} rounded={18} />
              <RecipeSteam
                key={name}
                trigger={name}
                count={8}
                topOffset={-8}
              />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-2xl leading-tight">{name}</h3>
              <p className="text-xs opacity-75">
                {day} · {slot} · {recipe.time}
              </p>
            </div>
          </div>
        </TiltCard>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat label="Kcal" value={planned.calories} />
          <Stat label="Protein" value={`${planned.proteinG}g`} />
          <Stat label="Carbs" value={`${planned.carbsG}g`} />
          <Stat label="Fats" value={`${planned.fatG}g`} />
        </div>
        <p className="mt-2 rounded-2xl bg-forest/[0.06] px-3 py-2 text-[11px] text-muted">
          Portion target for your {targets.calories} kcal day. Use about{" "}
          <span className="font-semibold text-ink-2">
            {Math.round(planned.portionFactor * 100)}%
          </span>{" "}
          of the listed recipe if you want it to fit tightly.
        </p>

        <SectionTitle>Ingredients</SectionTitle>
        <p className="-mt-1 mb-2 text-[11px] text-muted">
          Tap any ingredient to skip it or mark as pantry.
        </p>
        <div className="space-y-1.5">
          {recipe.ingredients.map((i) => {
            const lc = i.n.toLowerCase();
            const isSkipped = ingredientMatchesSkip(i.n, skipped);
            const isPantry = pantrySet.has(lc);
            return (
              <button
                key={i.n}
                type="button"
                data-tap
                onClick={() => onIngredientTap({ n: i.n, e: i.e })}
                className={clsx(
                  "tap-bounce w-full flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left text-sm transition",
                  isSkipped
                    ? "border-clay/30 bg-clay/5 line-through opacity-70"
                    : isPantry
                      ? "border-forest/20 bg-forest/[0.05]"
                      : "border-hairline bg-white/70",
                )}
              >
                <span className="text-lg">{i.e}</span>
                <span className="flex-1">{i.n}</span>
                {isSkipped ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-clay">
                    Skipped
                  </span>
                ) : isPantry ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-forest">
                    Pantry
                  </span>
                ) : null}
                <span className="text-xs font-semibold text-forest numerals">
                  {i.q}
                </span>
              </button>
            );
          })}
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
    </div>
  );
}

function IngredientSkipSheet({
  name,
  emoji,
  alreadySkipped,
  onClose,
  onSkip,
  onPantry,
}: {
  name: string;
  emoji: string;
  alreadySkipped: boolean;
  onClose: () => void;
  onSkip: () => void;
  onPantry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${name}`}
        className="sheet-anim relative mx-auto w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pt-3 shadow-elevated"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-2" />
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{emoji}</span>
          <div>
            <h3 className="font-display text-xl text-ink-2">{name}</h3>
            <p className="text-xs text-muted">What should we do with this?</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            data-tap
            onClick={onSkip}
            disabled={alreadySkipped}
            className={clsx(
              "tap-bounce w-full rounded-2xl border px-4 py-3 text-left",
              alreadySkipped
                ? "border-stone-2 bg-stone-2/30 text-muted cursor-not-allowed"
                : "border-clay/30 bg-clay/5 text-clay",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Ban size={14} aria-hidden /> Don&rsquo;t suggest again
            </div>
            <p className="mt-0.5 text-[11.5px] text-clay/80">
              {alreadySkipped
                ? "Already on your skip list."
                : "We'll never put this in a future plan. Editable in Settings."}
            </p>
          </button>

          <button
            type="button"
            data-tap
            onClick={onPantry}
            className="tap-bounce w-full rounded-2xl border border-forest/30 bg-forest/[0.06] px-4 py-3 text-left text-forest"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Home size={14} aria-hidden /> I always have this
            </div>
            <p className="mt-0.5 text-[11.5px] text-forest/80">
              Pantry items are hidden from the shopping list — recipes still use them.
            </p>
          </button>

          <button
            type="button"
            data-tap
            onClick={onClose}
            className="tap-bounce mt-2 inline-flex h-11 w-full items-center justify-center rounded-full border border-stone-2 bg-paper text-sm"
          >
            Cancel
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
  skipped,
  dietaryPreferences,
  onPick,
  onBan,
  onClose,
}: {
  day: string;
  slot: string;
  currentKey: string;
  banned: Set<string>;
  skipped: string[];
  dietaryPreferences: DietaryPref[];
  onPick: (newKey: string) => void;
  onBan: (key: string) => void;
  onClose: () => void;
}) {
  const alternatives = recipeKeys.filter((k) => {
    if (k === currentKey) return false;
    if (banned.has(k)) return false;
    const r = recipes[k];
    if (!r) return false;
    return recipeFitsSlot(k, r, slot) && recipeAllowedForPreferences(k, r, dietaryPreferences, skipped);
  });

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
              {day} · {slot} · replacing{" "}
              <span className="font-medium text-ink">{currentKey}</span>
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
          <span className="flex-1">
            Don&rsquo;t suggest &ldquo;{currentKey}&rdquo; again
          </span>
        </button>

        <div className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Pick an alternative
        </div>

        {alternatives.length === 0 ? (
          <p className="rounded-2xl border border-hairline bg-paper px-4 py-6 text-center text-sm text-muted">
            No more alternatives. Unban a meal in You · Settings or skip fewer ingredients.
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
                    <RecipeIcon recipeKey={key} size={40} rounded={12} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{key}</div>
                      <div className="text-[11px] text-muted">
                        {r ? `${r.kcal} kcal · ${r.p}g protein · ${r.time}` : "-"}
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
  "Reading your tastes...",
  "Balancing protein, carbs &amp; fat...",
  "Picking 7 days that flow together...",
  "Wrapping up your week...",
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
      timers.push(setTimeout(() => setStepIdx(i), i * stepDuration));
    }
    timers.push(
      setTimeout(() => onDone(), generateSteps.length * stepDuration + 200),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [phase, onDone]);

  return (
    <div className="stagger-up relative space-y-4 pb-32">
      <AmbientDrift density={5} className="rounded-3xl opacity-60" />
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOUR FOOD WEEK
        </p>
        <h1 className="font-display mt-1 text-[34px] leading-[1.05] text-ink-2">
          {phase === "running" ? (
            <>
              Building your <span className="text-forest">week...</span>
            </>
          ) : (
            <>
              Tap below to build your <span className="text-forest">first week.</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {phase === "running"
            ? "Hang tight. We're tailoring this to you."
            : `Hi ${name ?? "there"}. Nothing here yet — hit the green button to generate your 7-day plan.`}
        </p>
      </header>

      {/* Primary CTA — surfaced above the fold so first-time users can't miss it */}
      {phase === "idle" ? (
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-full bg-forest/30 blur-md animate-pulse"
          />
          <button
            type="button"
            data-tap
            onClick={() => {
              setStepIdx(0);
              setPhase("running");
            }}
            className="cta-glow tap-bounce relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest text-base font-semibold text-white shadow-elevated"
          >
            <Sparkles size={18} aria-hidden />
            Generate my first week
            <ArrowRight size={18} aria-hidden />
          </button>
          <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-forest">
            ↑ Tap here to start
          </p>
        </div>
      ) : null}

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

      {phase === "running" ? (
        <button
          type="button"
          disabled
          className="tap-bounce inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-forest/70 text-sm font-medium text-white shadow-elevated"
        >
          <Sparkles size={16} className="animate-pulse" aria-hidden />
          Generating...
        </button>
      ) : null}
    </div>
  );
}

interface WalkthroughStep {
  eyebrow: string;
  title: string;
  body: string;
  tint: string;
  emoji: string;
  bullets: string[];
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    eyebrow: "Step 1",
    emoji: "🗓️",
    title: "Your week, written like a story",
    body: "Each day is its own chapter — a mood, a key meal, a feel.",
    bullets: [
      "Today is the dark hero card.",
      "Open any day to see the full recipe and prep steps.",
    ],
    tint: "linear-gradient(160deg,#a7f3d0,#dff5e8)",
  },
  {
    eyebrow: "Step 2",
    emoji: "🚫",
    title: "Tap any ingredient to skip it",
    body: "Don't like mushrooms? Tap the chip in any recipe.",
    bullets: [
      "Choose <em>Don't suggest again</em> — gone forever.",
      "Or <em>I always have this</em> — kept in recipes, hidden from shopping.",
    ],
    tint: "linear-gradient(160deg,#f6c8c0,#fde7e3)",
  },
  {
    eyebrow: "Step 3",
    emoji: "🛍️",
    title: "Shopping list, ready",
    body: "Tap the bag in the corner — every ingredient, sorted by aisle.",
    bullets: [
      "Check items off as you shop.",
      "Pantry staples stay quiet at the bottom.",
    ],
    tint: "linear-gradient(160deg,#bae6fd,#e6f4fc)",
  },
];

function WalkthroughSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const total = walkthroughSteps.length;
  const current = walkthroughSteps[step];
  const isLast = step === total - 1;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fade-anim absolute inset-0 bg-black/40 backdrop-blur-[3px]"
      />
      <div
        className="sheet-anim absolute inset-x-0 bottom-0 mx-auto max-w-md overflow-hidden rounded-t-[28px] border border-white/70 bg-white shadow-elevated"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="px-5 pt-5 pb-6" style={{ background: current.tint }}>
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-2">
              {current.eyebrow}
            </span>
            <button
              type="button"
              data-tap
              onClick={onClose}
              aria-label="Skip walkthrough"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-muted hover:text-ink"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-4 text-5xl leading-none">{current.emoji}</div>
          <h2 className="font-display mt-3 text-[28px] leading-[1.1] text-ink-2">
            {current.title}
          </h2>
          <p className="mt-2 text-sm text-ink/80">{current.body}</p>
        </div>

        <div className="px-5 py-5">
          <ul className="space-y-2.5">
            {current.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                <span dangerouslySetInnerHTML={{ __html: b }} />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {walkthroughSteps.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (i === step ? "w-6 bg-forest" : "w-1.5 bg-ink/15")
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  data-tap
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-full bg-white/70 px-4 py-2 text-sm text-ink-2"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                data-tap
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                className="cta-glow rounded-full bg-forest px-5 py-2 text-sm font-medium text-white shadow-elevated"
              >
                {isLast ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
