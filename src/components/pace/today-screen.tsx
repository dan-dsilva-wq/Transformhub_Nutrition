"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Droplets,
  Edit3,
  Flame,
  Footprints,
  Moon,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  X,
} from "lucide-react";
import type { MealLog, WeightEntry } from "@/lib/state/types";
import { useAppState, useDayTotals, useTodayMeals } from "@/lib/state/app-state";
import {
  Button,
  Card,
  Field,
  Input,
  SectionHeader,
  Sheet,
} from "./primitives";
import { DailyReviewSheet } from "./daily-review-sheet";
import { trackTesterEvent } from "@/lib/tester/track";
import { useAppVersion } from "@/lib/app-version";

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeOfDayMark() {
  const h = new Date().getHours();
  if (h < 7) return { Icon: Moon, tint: "#7c8db5" };
  if (h < 11) return { Icon: Sunrise, tint: "#f59e0b" };
  if (h < 17) return { Icon: Sun, tint: "#f59e0b" };
  if (h < 20) return { Icon: Sunset, tint: "#fb923c" };
  return { Icon: Moon, tint: "#7c8db5" };
}

function vibeLine(args: {
  mealsCount: number;
  calorieRatio: number;
  overshoot: number;
  hour: number;
}) {
  const { mealsCount, calorieRatio, overshoot, hour } = args;
  if (overshoot > 0) return "A short walk will close the gap.";
  if (mealsCount === 0 && hour < 11) return "A fresh page. Let's go.";
  if (mealsCount === 0 && hour >= 11) return "Nothing logged yet — easy to fix.";
  if (calorieRatio >= 0.95) return "Right on target. Lovely.";
  if (calorieRatio >= 0.7) return "Almost there.";
  if (calorieRatio >= 0.4) return "Halfway there.";
  if (calorieRatio > 0) return "Nice start.";
  return "Let's get the day going.";
}

function computeStreak(meals: MealLog[]) {
  if (meals.length === 0) return 0;
  const days = new Set(meals.map((m) => m.loggedAt.slice(0, 10)));
  const today = new Date();
  let streak = 0;
  // Count back from today; allow today to be empty as long as yesterday continues.
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else if (i === 0) {
      // today empty — keep checking yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeightDelta(weights: WeightEntry[], days: number) {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) =>
    (a.isoDate ?? a.date).localeCompare(b.isoDate ?? b.date),
  );
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const inWindow = sorted.filter((w) => (w.isoDate ?? w.date.slice(0, 10)) >= cutoffIso);
  const ref = inWindow[0] ?? sorted[0];
  const latest = sorted[sorted.length - 1];
  if (!ref || !latest || ref === latest) return null;
  return latest.weightKg - ref.weightKg;
}

function computeAdherence(meals: MealLog[], targetCalories: number, days: number) {
  if (targetCalories <= 0) return null;
  const today = new Date();
  let scored = 0;
  let hits = 0;
  for (let i = 1; i <= days; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayMeals = meals.filter((m) => m.loggedAt.slice(0, 10) === key);
    if (dayMeals.length === 0) continue;
    scored += 1;
    const kcal = dayMeals.reduce((acc, m) => acc + m.calories, 0);
    if (Math.abs(kcal - targetCalories) <= targetCalories * 0.15) hits += 1;
  }
  if (scored === 0) return null;
  return Math.round((hits / scored) * 100);
}

const COVER_PALETTES: Array<[string, string, string]> = [
  ["#fde68a", "#f59e0b", "🥣"],
  ["#bbf7d0", "#65a30d", "🥗"],
  ["#bae6fd", "#0284c7", "🐟"],
  ["#fed7aa", "#fb923c", "🍳"],
  ["#ddd6fe", "#7c3aed", "🥑"],
  ["#fbcfe8", "#db2777", "🍓"],
  ["#a7f3d0", "#0d9488", "🥬"],
  ["#fde68a", "#d97706", "🥖"],
];
function coverFor(name: string): { from: string; to: string; glyph: string } {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [from, to, glyph] = COVER_PALETTES[h % COVER_PALETTES.length];
  return { from, to, glyph };
}

function todayLine() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date())
    .toUpperCase();
}

function todayIsoKey() {
  return new Date().toISOString().slice(0, 10);
}

function mealTotals(meals: MealLog[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteinG: acc.proteinG + meal.proteinG,
      carbsG: acc.carbsG + meal.carbsG,
      fatG: acc.fatG + meal.fatG,
      fiberG: acc.fiberG + meal.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

function groupMealsByDay(meals: MealLog[], todayKey: string) {
  const groups = new Map<string, MealLog[]>();

  for (const meal of meals) {
    const dayKey = meal.loggedAt.slice(0, 10);
    if (dayKey === todayKey) continue;
    groups.set(dayKey, [...(groups.get(dayKey) ?? []), meal]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayMeals]) => {
      const sortedMeals = [...dayMeals].sort((a, b) => Date.parse(b.loggedAt) - Date.parse(a.loggedAt));
      return {
        dayKey,
        meals: sortedMeals,
        totals: mealTotals(sortedMeals),
      };
    });
}

function formatHistoryDay(dayKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dayKey}T12:00:00`));
}

export function TodayScreen() {
  const { profile, targets, meals: allMeals, weights, waterMl, steps, auth, onboardingExtras, actions } = useAppState();
  const totals = useDayTotals();
  const meals = useTodayMeals();
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [stepsDraft, setStepsDraft] = useState(String(steps));
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(
    () => new Set(),
  );
  const [reviewDay, setReviewDay] = useState<string | null>(null);
  const appVersion = useAppVersion();

  useEffect(() => {
    if (auth.kind !== "signed-in") return;
    if (typeof window === "undefined") return;
    const userId = auth.userId;
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const lastKey = `pace.lastUsedDay.${userId}`;
    const lastUsed = window.localStorage.getItem(lastKey);
    // Daily tester review sheet is opt-in: it only fires for builds that
    // explicitly enable it (or for users that flipped the localStorage flag),
    // so production users don't get a "How was yesterday's version?" prompt.
    const testerMode =
      process.env.NEXT_PUBLIC_TESTER_MODE === "true" ||
      window.localStorage.getItem("pace.testerMode") === "true";
    if (testerMode && lastUsed && lastUsed !== ymd) {
      const seenKey = `pace.reviewSeen.${userId}.${lastUsed}`;
      if (!window.localStorage.getItem(seenKey)) {
        window.setTimeout(() => setReviewDay(lastUsed), 0);
      }
    }
    window.localStorage.setItem(lastKey, ymd);
    trackTesterEvent("app_open", undefined, { onceForKey: `app_open:${ymd}` });
  }, [auth]);

  function dismissReview(submitted: boolean) {
    if (reviewDay && auth.kind === "signed-in" && typeof window !== "undefined") {
      const seenKey = `pace.reviewSeen.${auth.userId}.${reviewDay}`;
      window.localStorage.setItem(seenKey, submitted ? "submitted" : "skipped");
    }
    if (submitted) trackTesterEvent("review_submitted", { day: reviewDay });
    setReviewDay(null);
  }

  const calorieRatio = Math.min(totals.calories / Math.max(targets.calories, 1), 1);
  const remaining = Math.max(targets.calories - totals.calories, 0);
  const overshoot = Math.max(totals.calories - targets.calories, 0);
  const streak = useMemo(() => computeStreak(allMeals), [allMeals]);
  const weightDelta = useMemo(() => computeWeightDelta(weights, 30), [weights]);
  const adherence = useMemo(
    () => computeAdherence(allMeals, targets.calories, 7),
    [allMeals, targets.calories],
  );

  const proteinRatio = Math.min(totals.proteinG / Math.max(targets.proteinG, 1), 1);
  const carbsRatio = Math.min(totals.carbsG / Math.max(targets.carbsG, 1), 1);
  const fatsRatio = Math.min(totals.fatG / Math.max(targets.fatG, 1), 1);
  const fiberRatio = Math.min(totals.fiberG / Math.max(targets.fiberG, 1), 1);
  const waterRatio = Math.min(waterMl / Math.max(targets.waterMl, 1), 1);
  const stepsRatio = Math.min(steps / Math.max(targets.steps, 1), 1);

  void weights;

  const nextAction = useMemo<{
    label: string;
    body: string;
    icon: "camera" | "water" | "steps";
  }>(() => {
    const h = new Date().getHours();
    if (meals.length === 0 && h < 11) {
      return { label: "Log breakfast", body: "Snap a photo or type it in.", icon: "camera" };
    }
    if (meals.length < 2 && h >= 11 && h < 15) {
      return { label: "Time for lunch", body: "Photo or typed food, whichever's easiest.", icon: "camera" };
    }
    if (meals.length < 3 && h >= 17) {
      return { label: "Log dinner", body: "A few seconds now keeps the day on track.", icon: "camera" };
    }
    if (waterMl < targets.waterMl * 0.5) {
      return {
        label: "Drink some water",
        body: `${(Math.max(targets.waterMl - waterMl, 0) / 1000).toFixed(1)} L to your target.`,
        icon: "water",
      };
    }
    if (overshoot > 0) {
      return { label: "A short walk", body: `About ${Math.round(overshoot / 60)} minutes will close the gap.`, icon: "steps" };
    }
    return { label: "Log a snack", body: "Even a small one keeps the day honest.", icon: "camera" };
  }, [meals.length, waterMl, targets.waterMl, overshoot]);

  const historyDays = useMemo(() => groupMealsByDay(allMeals, todayIsoKey()), [allMeals]);

  const editingMeal = allMeals.find((meal) => meal.id === editingMealId) ?? null;

  function openStepsEditor() {
    setStepsDraft(String(steps));
    setIsEditingSteps(true);
  }

  function saveSteps() {
    actions.setSteps(Math.max(0, Math.round(Number(stepsDraft) || 0)));
    setIsEditingSteps(false);
  }

  function toggleHistoryDay(dayKey: string) {
    setExpandedHistoryDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  }

  void profile;
  void proteinRatio;
  void carbsRatio;
  void fatsRatio;
  void fiberRatio;

  return (
    <div className="stagger-up space-y-4">
      {reviewDay ? (
        <DailyReviewSheet
          day={reviewDay}
          onClose={() => dismissReview(false)}
          onSubmitted={() => dismissReview(true)}
        />
      ) : null}
      {/* Eyebrow + headline */}
      <header data-tour="today-header">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            {todayLine()}
          </p>
          {streak > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-sky">
              <Flame size={11} aria-hidden />
              {streak}-day streak
            </span>
          ) : null}
        </div>
        <h1 className="font-display mt-2 flex flex-wrap items-center gap-2.5 text-[40px] leading-[1.02] text-ink-2">
          <span>
            <span className="italic text-forest">{greet()}</span>
            {onboardingExtras.name ? `, ${onboardingExtras.name}.` : "."}
          </span>
          {(() => {
            const { Icon, tint } = timeOfDayMark();
            return (
              <span
                className="float-anim inline-grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${tint}33, transparent 70%)`,
                }}
                aria-hidden
              >
                <Icon size={22} style={{ color: tint }} />
              </span>
            );
          })()}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          {vibeLine({
            mealsCount: meals.length,
            calorieRatio,
            overshoot,
            hour: new Date().getHours(),
          })}
        </p>
      </header>

      {/* Hero card  -  conic calorie ring + 4-col macro grid */}
      <Card className="relative overflow-hidden !p-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -top-12 h-[55%] aurora-anim opacity-70"
          style={{
            background:
              "radial-gradient(50% 50% at 30% 50%, rgba(0,143,208,0.45), transparent 60%), radial-gradient(45% 45% at 75% 40%, rgba(0,174,240,0.36), transparent 60%), radial-gradient(40% 40% at 50% 80%, rgba(0,60,83,0.32), transparent 60%)",
            filter: "blur(28px)",
          }}
        />
        <ConicRing ratio={calorieRatio} calories={totals.calories} target={targets.calories} />
        <div className="relative mt-3 inline-flex items-center justify-center gap-2 text-sm text-muted">
          {calorieRatio >= 1 && !overshoot ? (
            <>
              <Sparkles size={14} className="text-sage" aria-hidden />
              Target hit. Nice.
            </>
          ) : overshoot ? (
            <>
              <span className="rounded-full bg-clay/15 px-2.5 py-0.5 text-[12px] font-semibold text-clay">
                {overshoot} kcal over
              </span>
              <span className="text-faint">·</span>
              <span>a short walk closes the gap</span>
            </>
          ) : (
            <>
              <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[12px] font-semibold text-forest">
                {remaining} kcal left
              </span>
              <span className="text-faint">·</span>
              <span>{calorieRatio >= 0.4 ? "on track for a steady day" : "plenty of room"}</span>
            </>
          )}
        </div>

        <div className="relative mt-5 grid grid-cols-4 gap-3">
          <MacroRing label="Protein" value={totals.proteinG} target={targets.proteinG} colorVar="--color-forest" />
          <MacroRing label="Carbs" value={totals.carbsG} target={targets.carbsG} colorVar="--color-sky" />
          <MacroRing label="Fat" value={totals.fatG} target={targets.fatG} colorVar="--color-clay" />
          <MacroRing label="Fiber" value={totals.fiberG} target={targets.fiberG} colorVar="--color-sage" />
        </div>
      </Card>

      {/* Next action with shine sweep */}
      <Link href="/log" className="block group">
        <Card className="relative overflow-hidden cta-glow !p-4 group-active:scale-[0.99] transition">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shine-anim"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(0,143,208,0.18) 50%, transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-3.5">
            <span
              className="float-anim grid h-12 w-12 place-items-center rounded-2xl text-white shrink-0"
              style={{
                background: "linear-gradient(135deg,#008fd0,#003c53)",
                boxShadow: "0 10px 24px -10px rgba(0,143,208,0.65)",
              }}
              aria-hidden
            >
              {nextAction.icon === "water" ? (
                <Droplets size={20} />
              ) : nextAction.icon === "steps" ? (
                <Footprints size={20} />
              ) : (
                <Camera size={20} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[18px] text-ink-2">{nextAction.label}</div>
              <div className="text-[13px] text-muted leading-snug">{nextAction.body}</div>
            </div>
            <ArrowRight size={18} className="text-muted shrink-0" aria-hidden />
          </div>
        </Card>
      </Link>

      {/* Water + Steps tile grid */}
      <div className="grid grid-cols-2 gap-3">
        <WaterTile
          waterMl={waterMl}
          ratio={waterRatio}
          onAdd={() => actions.addWater(250)}
          onSub={() => actions.addWater(-250)}
        />
        <StepsTile
          steps={steps}
          ratio={stepsRatio}
          onEdit={openStepsEditor}
          onAdd={() => actions.setSteps(steps + 1000)}
        />
      </div>

      {/* Streak / weight / adherence ribbon */}
      {streak > 0 || weightDelta !== null || adherence !== null ? (
        <div
          className="surface-deep relative overflow-hidden px-4 py-3.5"
          style={{ borderRadius: 22 }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 90% 0%, rgba(0,174,240,0.40), transparent 55%), radial-gradient(circle at 0% 100%, rgba(0,143,208,0.30), transparent 55%)",
            }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <RibbonStat
              label="Streak"
              value={streak > 0 ? `${streak}` : "—"}
              suffix={streak > 0 ? (streak === 1 ? " day" : " days") : ""}
            />
            <span className="h-7 w-px bg-white/20" />
            <RibbonStat
              label="Last 30 days"
              value={
                weightDelta === null
                  ? "—"
                  : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}`
              }
              suffix={weightDelta === null ? "" : " kg"}
            />
            <span className="h-7 w-px bg-white/20" />
            <RibbonStat
              label="Adherence"
              value={adherence === null ? "—" : `${adherence}`}
              suffix={adherence === null ? "" : "%"}
            />
          </div>
        </div>
      ) : null}

      {/* Today's meals */}
      {meals.length > 0 ? (
        <section className="pt-2">
          <SectionHeader eyebrow="Logged" title="Today" />
          <ul className="space-y-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="card-flat flex items-center gap-3.5 px-4 py-3"
              >
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                ) : (
                  <MealCover name={m.name} size={44} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-2">
                    {m.name}
                  </div>
                  <div className="text-xs text-muted">
                    {new Intl.DateTimeFormat("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(m.loggedAt))}{" "}
                    · {Math.round(m.proteinG)}g protein
                  </div>
                </div>
                <div className="numerals text-base text-ink-2">{m.calories}</div>
                <button
                  type="button"
                  data-tap
                  onClick={() => setEditingMealId(m.id)}
                  aria-label={`Edit ${m.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
                >
                  <Edit3 size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  data-tap
                  onClick={() => actions.removeMeal(m.id)}
                  aria-label={`Delete ${m.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-clay"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pt-2">
        <SectionHeader eyebrow="History" title="Past days" />
        {historyDays.length > 0 ? (
          <ul className="space-y-2">
            {historyDays.map((day) => {
              const isExpanded = expandedHistoryDays.has(day.dayKey);
              return (
                <li key={day.dayKey} className="card-flat overflow-hidden">
                  <button
                    type="button"
                    data-tap
                    onClick={() => toggleHistoryDay(day.dayKey)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/60 text-muted border border-white/70">
                      {isExpanded ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-2">{formatHistoryDay(day.dayKey)}</div>
                      <div className="text-xs text-muted">
                        {day.meals.length} meal{day.meals.length === 1 ? "" : "s"} · {Math.round(day.totals.proteinG)}g protein
                      </div>
                    </div>
                    <div className="numerals text-base text-ink-2">{Math.round(day.totals.calories)}</div>
                  </button>
                  {isExpanded ? (
                    <ul className="space-y-2 border-t border-white/60 px-3 py-3">
                      {day.meals.map((meal) => (
                        <MealListItem
                          key={meal.id}
                          meal={meal}
                          onEdit={() => setEditingMealId(meal.id)}
                          onDelete={() => actions.removeMeal(meal.id)}
                        />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="!p-4">
            <p className="text-sm text-muted">Past meals will appear here after you log across more than one day.</p>
          </Card>
        )}
      </section>

      <div className="pt-2 pb-1 text-center text-[10px] tracking-[0.22em] uppercase text-faint">
        Transform Hub · v{appVersion}
      </div>

      <Sheet
        open={isEditingSteps}
        onClose={() => setIsEditingSteps(false)}
        title="Edit steps"
      >
        <div className="space-y-4 pb-4">
          <Field label="Steps today">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={stepsDraft}
              onChange={(e) => setStepsDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveSteps()}
            />
          </Field>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                actions.setSteps(0);
                setStepsDraft("0");
                setIsEditingSteps(false);
              }}
            >
              <RotateCcw size={17} aria-hidden /> Reset
            </Button>
            <Button type="button" fullWidth onClick={saveSteps}>
              <Save size={17} aria-hidden /> Save steps
            </Button>
          </div>
        </div>
      </Sheet>

      <MealEditSheet
        meal={editingMeal}
        onClose={() => setEditingMealId(null)}
        onSave={(id, patch) => {
          actions.updateMeal(id, patch);
          setEditingMealId(null);
        }}
        onDelete={(id) => {
          actions.removeMeal(id);
          setEditingMealId(null);
        }}
      />
    </div>
  );
}

function MealEditSheet({
  meal,
  onClose,
  onSave,
  onDelete,
}: {
  meal: MealLog | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<MealLog, "id">>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet open={Boolean(meal)} onClose={onClose} title="Edit meal">
      {meal ? (
        <MealEditForm
          key={meal.id}
          meal={meal}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : null}
    </Sheet>
  );
}

function MealListItem({
  meal,
  onEdit,
  onDelete,
}: {
  meal: MealLog;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="card-flat flex items-center gap-3.5 px-4 py-3">
      {meal.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meal.imageUrl}
          alt=""
          className="h-11 w-11 rounded-xl object-cover"
        />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-muted border border-white/70">
          <Camera size={15} aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink-2">{meal.name}</div>
        <div className="text-xs text-muted">
          {new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(meal.loggedAt))}{" "}
          · {meal.proteinG}g protein
        </div>
      </div>
      <div className="numerals text-base text-ink-2">{meal.calories}</div>
      <button
        type="button"
        data-tap
        onClick={onEdit}
        aria-label={`Edit ${meal.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
      >
        <Edit3 size={14} aria-hidden />
      </button>
      <button
        type="button"
        data-tap
        onClick={onDelete}
        aria-label={`Delete ${meal.name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-clay"
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </li>
  );
}

function MealEditForm({
  meal,
  onClose,
  onSave,
  onDelete,
}: {
  meal: MealLog;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Omit<MealLog, "id">>) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState({
    name: meal.name,
    calories: String(meal.calories),
    proteinG: String(meal.proteinG),
    carbsG: String(meal.carbsG),
    fatG: String(meal.fatG),
    fiberG: String(meal.fiberG),
  });

  function numberFrom(value: string) {
    return Math.max(0, Number(value) || 0);
  }

  function save() {
    onSave(meal.id, {
      name: draft.name.trim() || "Meal",
      calories: Math.round(numberFrom(draft.calories)),
      proteinG: numberFrom(draft.proteinG),
      carbsG: numberFrom(draft.carbsG),
      fatG: numberFrom(draft.fatG),
      fiberG: numberFrom(draft.fiberG),
    });
  }

  return (
    <div className="space-y-4 pb-4">
        <Field label="Meal name">
          <Input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </Field>
        <Field label="Calories">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={draft.calories}
            onChange={(e) => setDraft((prev) => ({ ...prev, calories: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <MacroField label="Protein" value={draft.proteinG} onChange={(proteinG) => setDraft((prev) => ({ ...prev, proteinG }))} />
          <MacroField label="Carbs" value={draft.carbsG} onChange={(carbsG) => setDraft((prev) => ({ ...prev, carbsG }))} />
          <MacroField label="Fats" value={draft.fatG} onChange={(fatG) => setDraft((prev) => ({ ...prev, fatG }))} />
          <MacroField label="Fiber" value={draft.fiberG} onChange={(fiberG) => setDraft((prev) => ({ ...prev, fiberG }))} />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(meal.id)}
          >
            <Trash2 size={17} aria-hidden /> Delete
          </Button>
          <Button type="button" fullWidth onClick={save}>
            <Save size={17} aria-hidden /> Save meal
          </Button>
        </div>
        <button
          type="button"
          data-tap
          onClick={onClose}
          className="mx-auto flex items-center justify-center gap-2 rounded-full px-4 text-sm text-muted hover:text-ink"
        >
          <X size={16} aria-hidden /> Cancel
        </button>
      </div>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={`${label} (g)`}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function MacroRing({
  label,
  value,
  target,
  colorVar,
}: {
  label: string;
  value: number;
  target: number;
  colorVar: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const dash = Math.round(pct * 100);
  const hit = pct >= 1;
  return (
    <div className="relative flex flex-col items-center rounded-[18px] border border-white/85 bg-white/65 px-1 py-2.5 shadow-[0_6px_16px_-10px_rgba(15,23,20,0.20)]">
      {hit ? (
        <span
          className="pop-in-anim absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-white shadow"
          style={{ background: `var(${colorVar})` }}
          aria-hidden
        >
          <Check size={11} strokeWidth={3} />
        </span>
      ) : null}
      <svg viewBox="0 0 36 36" className="h-12 w-12">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={3} />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} 100`}
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dasharray 500ms ease" }}
        />
        <text
          x="18"
          y="20.5"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight={700}
          fill="var(--color-ink-2)"
          className="numerals"
        >
          {dash}%
        </text>
      </svg>
      <div className="mt-1 text-[10.5px] font-semibold text-ink-2">{label}</div>
      <div className="numerals text-[9.5px] text-muted">
        {Math.round(value)} / {Math.round(target)}g
      </div>
    </div>
  );
}

function ConicRing({
  ratio,
  calories,
  target,
}: {
  ratio: number;
  calories: number;
  target: number;
}) {
  const pct = Math.max(0, Math.min(ratio, 1));
  const sweep = pct * 360;
  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      {/* halo */}
      <div
        aria-hidden
        className="spin-slow-anim pointer-events-none absolute -inset-6 rounded-full opacity-55"
        style={{
          background:
            "conic-gradient(from 200deg, rgba(0,143,208,0.65), rgba(0,174,240,0.50), rgba(0,60,83,0.40), rgba(0,143,208,0.65))",
          filter: "blur(22px)",
        }}
      />
      {/* track */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(rgba(15,23,20,0.06) 0 360deg)",
          WebkitMask:
            "radial-gradient(circle, transparent 86px, #000 87px, #000 105px, transparent 106px)",
          mask: "radial-gradient(circle, transparent 86px, #000 87px, #000 105px, transparent 106px)",
        }}
      />
      {/* fill */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full transition-[background] duration-500"
        style={{
          background: `conic-gradient(#003c53 0deg, #008fd0 ${Math.max(sweep * 0.5, 1)}deg, #00aef0 ${sweep}deg, rgba(0,0,0,0) ${sweep}deg 360deg)`,
          WebkitMask:
            "radial-gradient(circle, transparent 86px, #000 87px, #000 105px, transparent 106px)",
          mask: "radial-gradient(circle, transparent 86px, #000 87px, #000 105px, transparent 106px)",
        }}
      />
      {/* end-cap bead */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ transform: `rotate(${sweep}deg)`, transition: "transform 500ms ease" }}
      >
        <span
          className="absolute left-1/2 top-1/2 block h-[14px] w-[14px] rounded-full"
          style={{
            transform: "translate(-50%, -50%) translateY(-96px)",
            background: "linear-gradient(135deg,#00aef0,#008fd0)",
            boxShadow:
              "0 0 0 3px rgba(255,255,255,0.95), 0 6px 16px rgba(0,143,208,0.55)",
          }}
        />
      </div>
      {/* center label */}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display numerals text-[52px] leading-none text-ink-2">
            {Math.round(calories).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            / {target.toLocaleString()} kcal
          </div>
        </div>
      </div>
    </div>
  );
}

function WaterTile({
  waterMl,
  ratio,
  onAdd,
  onSub,
}: {
  waterMl: number;
  ratio: number;
  onAdd: () => void;
  onSub: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-white/85 px-4 pb-3 pt-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(102, 200, 232, 0.55), rgba(0, 143, 208, 0.10))",
        minHeight: 122,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
          Water
        </span>
      </div>
      <div className="font-display mt-0.5 text-[26px] leading-none text-ink-2">
        <span className="numerals">{(waterMl / 1000).toFixed(1)}</span>
        <span className="ml-0.5 text-[16px] font-medium text-muted">L</span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: `${Math.max(28, Math.min(ratio, 1) * 70)}%` }}
      >
        <svg
          className="water-drift-anim block h-full"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ width: "200%" }}
        >
          <defs>
            <linearGradient id="water-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#008fd0" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#003c53" stopOpacity="0.20" />
            </linearGradient>
          </defs>
          <path
            fill="url(#water-grad)"
            d="M0 60 C 150 30 300 90 600 60 S 1050 30 1200 60 L 1200 120 L 0 120 Z"
          />
          <path
            fill="url(#water-grad)"
            opacity="0.7"
            d="M0 80 C 200 50 350 110 600 80 S 1050 50 1200 80 L 1200 120 L 0 120 Z"
            transform="translate(60 0)"
          />
        </svg>
      </div>
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-1.5">
        <button
          type="button"
          data-tap
          onClick={onSub}
          disabled={waterMl <= 0}
          aria-label="Remove 250 ml of water"
          className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-ink-2 disabled:opacity-40"
        >
          −250 ml
        </button>
        <button
          type="button"
          data-tap
          onClick={onAdd}
          className="rounded-full bg-forest/15 px-2.5 py-1 text-[11px] font-semibold text-forest"
        >
          +250 ml
        </button>
      </div>
    </div>
  );
}

function StepsTile({
  steps,
  ratio,
  onEdit,
  onAdd,
}: {
  steps: number;
  ratio: number;
  onEdit: () => void;
  onAdd: () => void;
}) {
  const pct = Math.max(0, Math.min(ratio, 1));
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-white/85 px-4 pb-3 pt-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(0, 60, 83, 0.18), rgba(0, 143, 208, 0.10))",
        minHeight: 122,
      }}
    >
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">
        Steps
      </span>
      <div className="font-display numerals mt-0.5 text-[26px] leading-none text-ink-2">
        {steps.toLocaleString()}
      </div>
      <div aria-hidden className="absolute inset-x-3 bottom-12 h-[2px] overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: "var(--color-forest)" }}
        />
      </div>
      <Footprints
        size={64}
        aria-hidden
        className="pointer-events-none absolute -right-3 bottom-9 text-forest/15"
        strokeWidth={1.5}
      />
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-1.5">
        <button
          type="button"
          data-tap
          onClick={onEdit}
          aria-label="Edit steps"
          className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink"
        >
          <Edit3 size={13} aria-hidden />
        </button>
        <button
          type="button"
          data-tap
          onClick={onAdd}
          className="rounded-full bg-forest/15 px-2.5 py-1 text-[11px] font-semibold text-forest"
        >
          +1k
        </button>
      </div>
    </div>
  );
}

function RibbonStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="font-display numerals text-[22px] leading-none tracking-[-0.03em]">
        {value}
        {suffix ? <span className="text-[13px] font-medium opacity-90">{suffix}</span> : null}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>
    </div>
  );
}

function MealCover({ name, size = 44 }: { name: string; size?: number }) {
  const { from, to, glyph } = coverFor(name);
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.6), 0 6px 14px -8px rgba(0,0,0,0.25)",
      }}
      aria-hidden
    >
      <span style={{ fontSize: Math.round(size * 0.5) }}>{glyph}</span>
    </div>
  );
}
