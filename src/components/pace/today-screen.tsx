"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HealthConnect,
  isHealthConnectPlatform,
} from "@/lib/health/health-connect";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Droplets,
  Edit3,
  Footprints,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { MealLog } from "@/lib/state/types";
import { useAppState, useDayTotals, useTodayMeals } from "@/lib/state/app-state";
import {
  Button,
  Card,
  Field,
  Input,
  ProgressRing,
  SectionHeader,
  Sheet,
} from "./primitives";
import { DailyReviewSheet } from "./daily-review-sheet";

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
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
  const { profile, targets, meals: allMeals, weights, waterMl, steps, auth, actions } = useAppState();
  const totals = useDayTotals();
  const meals = useTodayMeals();
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [stepsDraft, setStepsDraft] = useState(String(steps));
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Set<string>>(
    () => new Set(),
  );
  const [reviewDay, setReviewDay] = useState<string | null>(null);

  useEffect(() => {
    if (auth.kind !== "signed-in") return;
    if (typeof window === "undefined") return;
    const userId = auth.userId;
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const lastKey = `pace.lastUsedDay.${userId}`;
    const lastUsed = window.localStorage.getItem(lastKey);
    if (lastUsed && lastUsed !== ymd) {
      const seenKey = `pace.reviewSeen.${userId}.${lastUsed}`;
      if (!window.localStorage.getItem(seenKey)) {
        setReviewDay(lastUsed);
      }
    }
    window.localStorage.setItem(lastKey, ymd);
  }, [auth]);

  function dismissReview(submitted: boolean) {
    if (reviewDay && auth.kind === "signed-in" && typeof window !== "undefined") {
      const seenKey = `pace.reviewSeen.${auth.userId}.${reviewDay}`;
      window.localStorage.setItem(seenKey, submitted ? "submitted" : "skipped");
    }
    setReviewDay(null);
  }

  const calorieRatio = Math.min(totals.calories / Math.max(targets.calories, 1), 1);
  const remaining = Math.max(targets.calories - totals.calories, 0);
  const overshoot = Math.max(totals.calories - targets.calories, 0);

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
      return { label: "Log breakfast", body: "Snap a photo — under 10 seconds.", icon: "camera" };
    }
    if (meals.length < 2 && h >= 11 && h < 15) {
      return { label: "Time for lunch", body: "One photo gets it logged in seconds.", icon: "camera" };
    }
    if (meals.length < 3 && h >= 17) {
      return { label: "Log dinner", body: "Keep it boring, keep it on plan.", icon: "camera" };
    }
    if (waterMl < targets.waterMl * 0.5) {
      return {
        label: "Drink some water",
        body: `${(Math.max(targets.waterMl - waterMl, 0) / 1000).toFixed(1)} L to target.`,
        icon: "water",
      };
    }
    if (overshoot > 0) {
      return { label: "Walk it off", body: `Roughly ${Math.round(overshoot / 60)} min walk closes the gap.`, icon: "steps" };
    }
    return { label: "Log a snack", body: "Even a small one keeps the day honest.", icon: "camera" };
  }, [meals.length, waterMl, targets.waterMl, overshoot]);

  const historyDays = useMemo(() => groupMealsByDay(allMeals, todayIsoKey()), [allMeals]);

  useEffect(() => {
    let cancelled = false;
    async function pullFromHealthConnect() {
      if (!isHealthConnectPlatform()) return;
      try {
        const { available } = await HealthConnect.isAvailable();
        if (!available) return;
        const { granted } = await HealthConnect.hasPermissions();
        if (!granted || cancelled) return;
        const { steps: stepCount } = await HealthConnect.readStepsToday();
        if (cancelled) return;
        if (typeof stepCount === "number" && stepCount >= 0) {
          actions.setSteps(stepCount);
        }
      } catch {
        /* Health Connect unavailable or denied — silent */
      }
    }
    void pullFromHealthConnect();
    return () => {
      cancelled = true;
    };
  }, [actions]);
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
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          {todayLine()}
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Light, <span className="text-forest">{greet()}.</span>
        </h1>
      </header>

      {/* Hero card — calorie ring + 4-col macro grid */}
      <Card className="!p-6 text-center">
        <div className="inline-flex">
          <ProgressRing value={calorieRatio} size={196} stroke={12} ariaLabel="Calorie progress">
            <div>
              <div className="numerals text-[44px] leading-none text-ink-2">
                {Math.round(totals.calories)}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.20em] text-muted">
                / {targets.calories}
              </div>
            </div>
          </ProgressRing>
        </div>
        <div className="mt-3 text-sm text-muted">
          {overshoot ? `${overshoot} kcal over target` : `${remaining} kcal remaining`}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <MacroRing label="Protein" value={totals.proteinG} target={targets.proteinG} colorVar="--color-forest" />
          <MacroRing label="Carbs" value={totals.carbsG} target={targets.carbsG} colorVar="--color-sky" />
          <MacroRing label="Fat" value={totals.fatG} target={targets.fatG} colorVar="--color-clay" />
          <MacroRing label="Fiber" value={totals.fiberG} target={targets.fiberG} colorVar="--color-sage" />
        </div>
      </Card>

      {/* Next action with gradient pill */}
      <Link href="/log" className="block group">
        <Card className="!p-4 group-active:scale-[0.99] transition">
          <div className="flex items-center gap-3.5">
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl text-white shrink-0"
              style={{
                background: "linear-gradient(135deg,#a7f3d0,#bae6fd)",
                boxShadow: "0 6px 20px -8px rgba(13,148,136,0.45)",
              }}
              aria-hidden
            >
              {nextAction.icon === "water" ? (
                <Droplets size={20} className="text-ink-2" />
              ) : nextAction.icon === "steps" ? (
                <Footprints size={20} className="text-ink-2" />
              ) : (
                <Camera size={20} className="text-ink-2" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-base text-ink-2">{nextAction.label}</div>
              <div className="text-[13px] text-muted leading-snug">{nextAction.body}</div>
            </div>
          </div>
        </Card>
      </Link>

      {/* Water + Steps tile grid */}
      <div className="grid grid-cols-2 gap-3">
        <TileFrost
          label="Water"
          value={`${(waterMl / 1000).toFixed(1)}L`}
          pct={waterRatio}
          colorVar="--color-sky"
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-tap
                onClick={() => actions.addWater(-250)}
                disabled={waterMl <= 0}
                aria-label="Remove 250 ml of water"
                className="text-[11px] font-medium text-muted underline-offset-4 hover:underline hover:text-ink disabled:opacity-40 disabled:no-underline"
              >
                −250 ml
              </button>
              <button
                type="button"
                data-tap
                onClick={() => actions.addWater(250)}
                className="text-[11px] font-medium text-forest underline-offset-4 hover:underline"
              >
                +250 ml
              </button>
            </div>
          }
        />
        <TileFrost
          label="Steps"
          value={steps.toLocaleString()}
          pct={stepsRatio}
          colorVar="--color-forest"
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-tap
                onClick={openStepsEditor}
                aria-label="Edit steps"
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink"
              >
                <Edit3 size={13} aria-hidden />
              </button>
              <button
                type="button"
                data-tap
                onClick={() => actions.setSteps(steps + 1000)}
                className="text-[11px] font-medium text-forest underline-offset-4 hover:underline"
              >
                +1k
              </button>
            </div>
          }
        />
      </div>

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
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-muted border border-white/70">
                    <Camera size={15} aria-hidden />
                  </div>
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
                    · {m.proteinG}g protein
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
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 36 36" className="h-14 w-14">
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
      <div className="mt-1.5 text-[11px] font-medium text-ink-2">{label}</div>
      <div className="numerals text-[10px] text-muted">
        {Math.round(value)} / {Math.round(target)}g
      </div>
    </div>
  );
}

function TileFrost({
  label,
  value,
  pct,
  colorVar,
  action,
}: {
  label: string;
  value: string;
  pct: number;
  colorVar: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        {action}
      </div>
      <div className="numerals mt-1 text-2xl text-ink-2">{value}</div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.08]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(pct, 1) * 100}%`, background: `var(${colorVar})` }}
        />
      </div>
    </div>
  );
}
