"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListChecks, Lock, RefreshCw, Sparkles } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { useEntitlement } from "@/lib/entitlement";
import { dietaryLabel } from "@/lib/meal-plan";
import { Card, IconBadge } from "../primitives";
import { PaywallSheet } from "../paywall-sheet";
import { LessonGridCard, type LessonState } from "./lesson-grid-card";
import { TodayPlate } from "./today-plate";
import { lessons } from "./lessons";

export function PlanHub({ onRegenerate }: { onRegenerate: () => void }) {
  const verdict = useEntitlement("nutrition-guide");
  const { onboardingExtras, targets, approvedFoods } = useAppState();
  const plan = onboardingExtras.nutritionPlan;
  const [paywallOpen, setPaywallOpen] = useState(false);

  const completed = useMemo(
    () => new Set(plan?.lessonsCompleted ?? []),
    [plan],
  );
  const allDone = completed.size >= lessons.length;
  const firstUncompleted = lessons.find((l) => !completed.has(l.index));

  if (!plan) return null;

  const states: LessonState[] = lessons.map((lesson) => {
    if (completed.has(lesson.index)) return "completed";
    if (allDone) return "available";
    if (firstUncompleted && lesson.index === firstUncompleted.index) {
      return "current";
    }
    return "locked";
  });

  const name = onboardingExtras.name;
  const approvedCount = approvedFoods.length;
  const prefs = onboardingExtras.dietaryPreferences;

  function handleRegenerate() {
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }
    onRegenerate();
  }

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · NUTRITION
        </p>
        <h1 className="font-display mt-2 text-[40px] leading-[1.05] text-ink-2">
          Your plan{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-2 text-sm text-muted">
          {dietaryLabel(prefs)} ·{" "}
          <span className="numerals text-ink-2">{targets.calories}</span> kcal
          · <span className="numerals text-ink-2">{targets.proteinG}</span>g
          protein
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-1.5">
            {lessons.map((l) => {
              const done = completed.has(l.index);
              const current =
                !done && firstUncompleted?.index === l.index && !allDone;
              return (
                <span
                  key={l.id}
                  className={
                    current
                      ? "h-1.5 flex-1 rounded-full bg-forest"
                      : done
                        ? "h-1.5 flex-1 rounded-full bg-forest/40"
                        : "h-1.5 flex-1 rounded-full bg-stone-2"
                  }
                />
              );
            })}
          </div>
          <span className="text-xs text-muted">
            <span className="numerals text-ink-2">{completed.size}</span> of{" "}
            {lessons.length}
          </span>
        </div>
      </header>

      <section>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Lessons
        </p>
        <ul className="grid grid-cols-2 gap-3">
          {lessons.map((lesson, i) => (
            <li key={lesson.id}>
              <LessonGridCard lesson={lesson} state={states[i]} />
            </li>
          ))}
        </ul>
      </section>

      <TodayPlate />

      <Card>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Tweak your plan
        </p>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href={
                firstUncompleted
                  ? `/you/foods/learn/${firstUncompleted.id}`
                  : `/you/foods/learn/${lessons[0].id}`
              }
              data-tap
              className="tap-bounce flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm text-ink-2 backdrop-blur-xl hover:bg-white/75"
            >
              <span className="flex items-center gap-3">
                <IconBadge tone="forest">
                  <Sparkles size={14} aria-hidden />
                </IconBadge>
                <span>
                  <span className="block font-medium">
                    {allDone
                      ? "Take the tour again"
                      : firstUncompleted
                        ? "Continue the tour"
                        : "Start the tour"}
                  </span>
                  <span className="text-xs text-muted">
                    Walk through all 8 lessons
                  </span>
                </span>
              </span>
              <span className="text-muted">›</span>
            </Link>
          </li>
          <li>
            <Link
              href="/you/foods/list"
              data-tap
              className="tap-bounce flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm text-ink-2 backdrop-blur-xl hover:bg-white/75"
            >
              <span className="flex items-center gap-3">
                <IconBadge tone="sage">
                  <ListChecks size={14} aria-hidden />
                </IconBadge>
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
          </li>
          <li>
            <button
              type="button"
              data-tap
              onClick={handleRegenerate}
              className="tap-bounce flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-left text-sm text-ink-2 backdrop-blur-xl hover:bg-white/75"
            >
              <span className="flex items-center gap-3">
                <IconBadge tone={verdict.allowed ? "amber" : "stone"}>
                  {verdict.allowed ? (
                    <RefreshCw size={14} aria-hidden />
                  ) : (
                    <Lock size={14} aria-hidden />
                  )}
                </IconBadge>
                <span>
                  <span className="block font-medium">Re-generate plan</span>
                  <span className="text-xs text-muted">
                    Refresh the lesson copy with a new pass
                  </span>
                </span>
              </span>
              <span className="text-muted">›</span>
            </button>
          </li>
        </ul>
      </Card>

      <p className="text-xs text-muted">
        Portions are guides, not rules. Trust hunger, energy, and the weekly
        trend on the scale.
      </p>

      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="nutrition-guide"
      />
    </div>
  );
}
