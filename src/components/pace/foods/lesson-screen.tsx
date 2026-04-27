"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { buildMealSlots, filterApprovedFoods } from "@/lib/meal-plan";
import type { FoodCategory } from "@/lib/nutrition";
import { Button, Card, IconBadge } from "../primitives";
import { MealSlotCard } from "./meal-slot-card";
import { lessons, lessonsById, type LessonId } from "./lessons";

const categoryLabel: Record<FoodCategory, string> = {
  proteins: "Your proteins",
  carbs: "Your carbs",
  fiber: "Your veg & fiber",
  fats: "Your fats",
};

export function LessonScreen({ lessonId }: { lessonId: LessonId }) {
  const router = useRouter();
  const { onboardingExtras, targets, approvedFoods, actions } = useAppState();
  const plan = onboardingExtras.nutritionPlan;

  const lesson = lessonsById[lessonId];
  const prefs = onboardingExtras.dietaryPreferences;
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;

  const slots = useMemo(
    () => buildMealSlots(targets, mealsPerDay),
    [targets, mealsPerDay],
  );
  const foodsByCategory = useMemo(
    () => filterApprovedFoods(approvedFoods, prefs),
    [approvedFoods, prefs],
  );

  useEffect(() => {
    if (!plan) {
      router.replace("/you/foods");
    }
  }, [plan, router]);

  if (!plan) return null;

  const copy = plan.copy[lesson.copyKey];
  const total = lessons.length;
  const isLast = lesson.index === total - 1;
  const next = lessons[lesson.index + 1];

  function handleNext() {
    actions.markLessonComplete(lesson.index);
    if (isLast) {
      router.push("/you/foods");
    } else if (next) {
      router.push(`/you/foods/learn/${next.id}`);
    }
  }

  const paragraphs = copy.body.split(/\n{2,}/).filter(Boolean);
  const Icon = lesson.Icon;

  return (
    <>
      <div className="stagger-up space-y-6 pb-8">
        <header>
          <Link
            href="/you/foods"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden /> Back to plan
          </Link>
          <div
            className="mt-3 flex items-center gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={lesson.index + 1}
            aria-label={`Lesson ${lesson.index + 1} of ${total}`}
          >
            {lessons.map((l) => {
              const done = plan.lessonsCompleted.includes(l.index);
              const current = l.index === lesson.index;
              return (
                <span
                  key={l.id}
                  className={clsx(
                    "h-1.5 flex-1 rounded-full transition",
                    current
                      ? "bg-forest"
                      : done
                        ? "bg-forest/40"
                        : "bg-stone-2",
                  )}
                />
              );
            })}
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            {lesson.eyebrow}
          </p>
        </header>

        <Card>
          <div className="flex items-center gap-3">
            <IconBadge tone="forest">
              <Icon size={16} aria-hidden />
            </IconBadge>
            <h1 className="font-display text-[28px] leading-[1.1] text-ink-2">
              {copy.headline}
            </h1>
          </div>

          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-2">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <ul className="mt-5 space-y-2">
            {copy.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-ink-2"
              >
                <span
                  className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/15 text-forest"
                  aria-hidden
                >
                  <Check size={11} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>

        {lesson.showTargets ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Your daily targets
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TargetTile label="Calories" value={`${targets.calories}`} unit="kcal" />
              <TargetTile label="Protein" value={`${targets.proteinG}`} unit="g" />
              <TargetTile label="Carbs" value={`${targets.carbsG}`} unit="g" />
              <TargetTile label="Fats" value={`${targets.fatG}`} unit="g" />
              <TargetTile label="Fiber" value={`${targets.fiberG}`} unit="g" />
              <TargetTile label="Water" value={`${Math.round(targets.waterMl / 1000 * 10) / 10}`} unit="L" />
            </div>
          </Card>
        ) : null}

        {lesson.foodCategory ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              {categoryLabel[lesson.foodCategory]}
            </p>
            <FoodChips
              names={foodsByCategory[lesson.foodCategory].map((f) => f.name)}
            />
            <Link
              href="/you/foods/list"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-2"
            >
              Edit my list <ArrowRight size={12} aria-hidden />
            </Link>
          </Card>
        ) : null}

        {lesson.showWater ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Your water target
            </p>
            <p className="mt-2 font-display text-3xl text-ink-2">
              <span className="numerals">{targets.waterMl}</span>
              <span className="ml-1 text-base text-muted">ml/day</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Roughly {Math.round(targets.waterMl / 250)} glasses. Coffee and tea count.
            </p>
          </Card>
        ) : null}

        {lesson.showPlate ? (
          <div className="space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Your plate at each meal
            </p>
            <ul className="space-y-4">
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
          </div>
        ) : null}

        {lesson.showTiming ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Your meal rhythm
            </p>
            <ul className="mt-3 space-y-2">
              {slots.map((slot) => (
                <li
                  key={slot.key}
                  className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/55 px-3 py-2.5 backdrop-blur-xl"
                >
                  <span className="text-sm text-ink-2">{slot.label}</span>
                  <span className="text-xs text-muted">
                    {slot.timeHint ?? "—"} ·{" "}
                    <span className="numerals text-ink-2">{slot.calorieTarget}</span>{" "}
                    kcal
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          {lesson.index > 0 ? (
            <Link
              href={`/you/foods/learn/${lessons[lesson.index - 1].id}`}
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
            >
              <ArrowLeft size={14} aria-hidden /> Back
            </Link>
          ) : (
            <span />
          )}

          <Button onClick={handleNext} size="lg">
            {isLast ? "Finish" : "Next"}
            {!isLast ? <ArrowRight size={16} aria-hidden /> : null}
          </Button>
        </div>
      </div>
    </>
  );
}

function TargetTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-2.5 backdrop-blur-xl">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="numerals text-xl text-ink-2">{value}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
    </div>
  );
}

function FoodChips({ names }: { names: string[] }) {
  if (names.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        Nothing on your list in this group yet — add a few from the catalog.
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {names.map((n) => (
        <li
          key={n}
          className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-xs text-ink-2 backdrop-blur"
        >
          {n}
        </li>
      ))}
    </ul>
  );
}
