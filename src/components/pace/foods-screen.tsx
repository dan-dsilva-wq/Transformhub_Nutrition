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
  Timer,
  Utensils,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import type { DailyTargets } from "@/lib/targets";
import type { DietaryPref } from "@/lib/state/types";
import { LockedState } from "./paywall-sheet";
import {
  mealIcoFor,
  recipeKeys,
  recipes,
  type Recipe,
} from "./foods/food-data";
import { recipeImage } from "./foods/recipe-images";
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

const COVER_PALETTES: Array<[string, string]> = [
  ["#fde68a", "#f59e0b"],
  ["#bbf7d0", "#65a30d"],
  ["#bae6fd", "#0284c7"],
  ["#fed7aa", "#fb923c"],
  ["#ddd6fe", "#7c3aed"],
  ["#fbcfe8", "#db2777"],
  ["#a7f3d0", "#0d9488"],
  ["#fde68a", "#d97706"],
];
function coverFor(key: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const [from, to] = COVER_PALETTES[h % COVER_PALETTES.length];
  return { from, to };
}


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
  function generateNextWeek() {
    if (!canGenerateMore) return;
    actions.setOnboardingExtras({ weeksAhead: weeksAhead + 1 });
    setWeekIndex(weekIndex + 1);
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
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Your food week
          </p>
          <h1 className="font-display mt-2 flex flex-wrap items-center gap-2.5 text-[40px] leading-[1.02] text-ink-2">
            {week.name === "This week" ? (
              <>
                <span>
                  This <span className="italic text-forest">week.</span>
                </span>
                <span
                  className="float-anim inline-grid h-9 w-9 place-items-center rounded-full text-forest"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(13,148,136,0.32), transparent 70%)",
                  }}
                  aria-hidden
                >
                  <Utensils size={20} />
                </span>
              </>
            ) : (
              week.name
            )}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {week.range} · {mealsPerDay} meals/day
          </p>
        </header>

        <div className="flex items-center gap-1.5 rounded-full border border-white/85 bg-white/55 p-1.5 backdrop-blur-xl">
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
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                badgeTone[week.badgeClass],
              )}
            >
              {week.badge}
            </span>
            <button
              type="button"
              data-tap
              onClick={() => setMealCountOpen(true)}
              aria-haspopup="dialog"
              className="tap-bounce inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-semibold text-ink-2 shadow-sm"
              aria-label="Change meals per day"
            >
              <Utensils size={11} aria-hidden /> {mealsPerDay}/day
            </button>
            <button
              type="button"
              data-tap
              onClick={() =>
                actions.setOnboardingExtras({
                  weekPlanSeed: planSeed + 1,
                  shoppingChecked: [],
                })
              }
              className="tap-bounce grid h-7 w-7 place-items-center rounded-full bg-white text-ink-2 shadow-sm"
              aria-label="Re-roll the week"
              title="Re-roll the week"
            >
              <RefreshCw size={12} aria-hidden />
            </button>
          </div>
          {isLastWeek && canGenerateMore ? (
            <button
              type="button"
              data-tap
              onClick={generateNextWeek}
              className="tap-bounce inline-flex h-9 items-center gap-1 rounded-full bg-forest px-3 text-xs font-semibold text-white shadow-sm"
              aria-label="Generate next week"
            >
              <Plus size={14} aria-hidden /> Generate
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

        {week.showShop ? (
          <Link
            href="/you/foods/shopping"
            aria-label="Open shopping list"
            className="tap-bounce flex items-center gap-3 rounded-[22px] border border-forest/25 px-3.5 py-3"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,148,136,0.16), rgba(13,148,136,0.04))",
            }}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-forest text-white"
              style={{ boxShadow: "0 8px 20px -10px rgba(13,148,136,0.65)" }}
            >
              <ShoppingBag size={16} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink-2">
                Shopping list ready
              </span>
              <span className="block text-[11.5px] text-muted">
                Sorted by aisle · tap to open
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-forest" aria-hidden />
          </Link>
        ) : null}

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
            className="tap-bounce flex items-center gap-3 rounded-3xl p-4 text-white shadow-elevated"
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
          <p className="px-2 pt-2 text-center text-[11px] text-muted">
            Hiding{" "}
            <span className="font-medium text-ink">{skipped.length}</span>{" "}
            ingredient{skipped.length === 1 ? "" : "s"} — set in{" "}
            <Link href="/you/foods/list" className="font-medium text-forest">
              You → Foods to skip
            </Link>
          </p>
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

  if (isToday) {
    return (
      <article
        className="relative overflow-hidden rounded-[28px] px-4 pb-4 pt-4.5 text-cream"
        style={{
          background: "linear-gradient(135deg, #064e46 0%, #0d9488 100%)",
          boxShadow: "0 30px 60px -28px rgba(13,148,136,0.65)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -top-6 h-[70%] aurora-anim"
          style={{
            background:
              "radial-gradient(50% 50% at 30% 40%, rgba(167,243,208,0.45), transparent 60%), radial-gradient(45% 45% at 75% 30%, rgba(186,230,253,0.45), transparent 60%), radial-gradient(40% 40% at 50% 70%, rgba(251,146,60,0.30), transparent 60%)",
            filter: "blur(28px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shine-anim"
          style={{
            background:
              "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
          }}
        />

        <div className="relative flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-cream/72">
          <span className="inline-flex items-center gap-1.5">
            <span className="grid h-2 w-2 place-items-center rounded-full bg-mint" style={{ background: "#a7f3d0" }} />
            {day.name} · {dateLabel} · Today
          </span>
          {minutes ? <span>~{minutes} min · cook</span> : null}
        </div>

        <h3 className="font-display relative mt-1.5 text-[26px] leading-[1.05] tracking-[-0.025em] text-cream">
          {title}
        </h3>
        <p className="relative mt-1 text-[12.5px] text-cream/78">{subtitle}</p>

        <div
          className="relative mt-3 flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5"
        >
          <TodayStat num={`${nutrition.calories}`} lbl="Kcal" />
          <span className="h-5 w-px bg-white/22" />
          <TodayStat num={`${nutrition.proteinG}`} suffix="g" lbl="Protein" />
          <span className="h-5 w-px bg-white/22" />
          <TodayStat num={`${nutrition.carbsG}`} suffix="g" lbl="Carbs" />
          <span className="h-5 w-px bg-white/22" />
          <TodayStat num={`${day.meals.length}`} lbl="Meals" />
        </div>

        <div className="relative mt-3.5 grid grid-cols-3 gap-2.5">
          {day.meals.slice(0, 3).map((m, mi) => {
            const slotLabel = slots[mi] ?? "";
            return (
              <TodayPuck
                key={`${day.name}-${mi}`}
                slotLabel={slotLabel}
                recipeKey={m.key}
                slotIdx={mi}
                mealsPerDay={mealsPerDay}
                targets={targets}
                onTap={() => onMealTap(day.name, slotLabel, m.key, dayIdx, mi)}
              />
            );
          })}
        </div>
        {day.meals.length > 3 ? (
          <div className="relative mt-2 grid grid-cols-2 gap-2">
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
                  className="tap-bounce flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 text-left"
                >
                  <MealCover recipeKey={m.key} slotLabel={slotLabel} className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-cream/72">
                      {slotLabel}
                    </span>
                    <span className="block truncate text-[12px] font-semibold leading-tight text-cream">
                      {m.key}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className="relative overflow-hidden rounded-[26px] border border-white/85 bg-white/55 px-3.5 pb-3 pt-3.5 backdrop-blur-xl"
      style={{ boxShadow: "0 14px 30px -22px rgba(15,23,20,0.18)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-55"
        style={{
          background: mood.tint,
          WebkitMask: "linear-gradient(180deg, #000 0%, transparent 100%)",
          mask: "linear-gradient(180deg, #000 0%, transparent 100%)",
        }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="font-display truncate text-[20px] tracking-[-0.022em] text-ink-2">
            {title}
          </h3>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {dateLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {minutes ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[.06] px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
              <Timer size={10} aria-hidden /> {minutes}m
            </span>
          ) : null}
          <span className="numerals rounded-full bg-forest/12 px-2 py-0.5 text-[10.5px] font-semibold text-forest">
            {nutrition.calories} kcal
          </span>
        </div>
      </div>
      <p className="relative mt-1 text-[12px] text-muted">{subtitle}</p>

      <div
        className="relative mt-2.5 -mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {day.meals.map((m, mi) => {
          const slotLabel = slots[mi] ?? "";
          return (
            <DayPuck
              key={`${day.name}-${mi}`}
              slotLabel={slotLabel}
              recipeKey={m.key}
              onTap={() => onMealTap(day.name, slotLabel, m.key, dayIdx, mi)}
            />
          );
        })}
      </div>
    </article>
  );
}

function MealCover({
  recipeKey,
  className,
  rounded = "rounded-xl",
  showSlotTag,
  slotLabel,
}: {
  recipeKey: string;
  className?: string;
  rounded?: string;
  showSlotTag?: boolean;
  slotLabel?: string;
}) {
  const img = recipeImage(recipeKey);
  const { from, to } = coverFor(recipeKey);

  if (img) {
    return (
      <span
        className={clsx("relative overflow-hidden", rounded, className)}
        style={{
          backgroundColor: from,
          backgroundImage: `url(${img.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.5), 0 6px 14px -8px rgba(0,0,0,0.4)",
        }}
        aria-hidden
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.32) 100%)",
          }}
        />
        {showSlotTag && slotLabel ? (
          <span
            className="absolute bottom-1.5 left-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            {slotLabel}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={clsx("relative overflow-hidden", rounded, className)}
      style={{
        backgroundImage: `radial-gradient(120% 80% at 78% 18%, ${from} 0%, transparent 58%), radial-gradient(140% 90% at 12% 100%, ${to} 0%, transparent 55%), linear-gradient(160deg, #1f2a26 0%, #0a0d0c 100%)`,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 6px 14px -8px rgba(0,0,0,0.4)",
      }}
      aria-hidden
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <span
        className="absolute bottom-1.5 left-2 text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/85"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
      >
        {slotLabel ? `${slotLabel} · ` : ""}Coming soon
      </span>
    </span>
  );
}

function TodayStat({
  num,
  suffix,
  lbl,
}: {
  num: string;
  suffix?: string;
  lbl: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="font-display numerals text-[18px] leading-none tracking-[-0.02em] text-cream">
        {num}
        {suffix ? <span className="text-[11px] font-medium">{suffix}</span> : null}
      </div>
      <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-cream/72">
        {lbl}
      </div>
    </div>
  );
}

function TodayPuck({
  slotLabel,
  recipeKey,
  slotIdx,
  mealsPerDay,
  targets,
  onTap,
}: {
  slotLabel: string;
  recipeKey: string;
  slotIdx: number;
  mealsPerDay: number;
  targets: DailyTargets;
  onTap: () => void;
}) {
  const recipe = recipes[recipeKey];
  const macros = recipe
    ? plannedNutritionForRecipe(recipe, slotIdx, mealsPerDay, targets)
    : null;
  return (
    <button
      type="button"
      data-tap
      onClick={onTap}
      className="tap-bounce flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-white/10 p-2.5 text-left text-cream backdrop-blur"
      aria-label={`${slotLabel}: ${recipeKey}`}
    >
      <MealCover recipeKey={recipeKey} slotLabel={slotLabel} className="h-14 w-full" />
      <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-cream/72">
        {slotLabel}
      </span>
      <span className="line-clamp-2 text-[12px] font-semibold leading-[1.18] text-cream">
        {recipeKey}
      </span>
      {macros ? (
        <span className="numerals text-[10.5px] text-cream/72">
          {macros.calories} kcal · {macros.proteinG}g P
        </span>
      ) : null}
    </button>
  );
}

function DayPuck({
  slotLabel,
  recipeKey,
  onTap,
}: {
  slotLabel: string;
  recipeKey: string;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      data-tap
      onClick={onTap}
      className="tap-bounce flex w-[150px] shrink-0 flex-col gap-1.5 rounded-2xl border border-white/95 bg-white/70 p-2 text-left"
      style={{ scrollSnapAlign: "start" }}
      aria-label={`${slotLabel}: ${recipeKey}`}
    >
      <MealCover recipeKey={recipeKey} slotLabel={slotLabel} className="h-16 w-full" />
      <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
        {slotLabel}
      </span>
      <span className="block text-[12px] font-semibold leading-[1.18] text-ink-2 line-clamp-2">
        {recipeKey}
      </span>
    </button>
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
                    <span className="text-2xl leading-none">{mealIcoFor(key)}</span>
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
    <div className="stagger-up space-y-4 pb-32">
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
