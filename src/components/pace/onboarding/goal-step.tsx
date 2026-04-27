"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { calculateDailyTargets } from "@/lib/targets";
import { Button, Field, Input } from "../primitives";
import type { ProfileDraft } from "@/lib/state/types";

function isoDateAddDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + Math.ceil(days));
  return d.toISOString().slice(0, 10);
}

function formatGoalDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function GoalStep({ onNext }: { onNext: () => void }) {
  const { draft, actions } = useAppState();
  const [local, setLocal] = useState<ProfileDraft>(draft);

  const projection = useMemo(() => {
    try {
      const profile = {
        age: Number(local.age) || 30,
        sexForCalories: local.sexForCalories,
        heightCm: Number(local.heightCm) || 170,
        currentWeightKg: Number(local.currentWeightKg) || 80,
        goalWeightKg: Number(local.goalWeightKg) || 0,
        activityLevel: local.activityLevel,
        baselineSteps: Number(local.baselineSteps) || 5000,
        workoutsPerWeek: Number(local.workoutsPerWeek) || 3,
      };
      if (profile.goalWeightKg <= 0) return null;
      const t = calculateDailyTargets(profile);
      const delta = Math.max(profile.currentWeightKg - profile.goalWeightKg, 0);
      const days = t.weeklyLossKg > 0 ? (delta / t.weeklyLossKg) * 7 : 0;
      const goalDateIso = days > 0 ? isoDateAddDays(days) : undefined;
      return { weeklyLossKg: t.weeklyLossKg, goalDateIso };
    } catch {
      return null;
    }
  }, [local]);

  useEffect(() => {
    if (projection?.goalDateIso) {
      actions.setOnboardingExtras({ goalDateIso: projection.goalDateIso });
    }
  }, [projection?.goalDateIso, actions]);

  const isValid =
    Number(local.goalWeightKg) > 0 &&
    Number(local.goalWeightKg) <= Number(local.currentWeightKg);

  function submit() {
    if (!isValid) return;
    actions.setDraft(local);
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 3 · Goal
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          Where are you headed?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Pick an honest goal weight. We&apos;ll suggest a sustainable pace from there.
        </p>
        <div className="mt-8">
          <Field label="Goal weight (kg)">
            <Input
              inputMode="decimal"
              value={local.goalWeightKg}
              onChange={(e) =>
                setLocal({ ...local, goalWeightKg: e.target.value })
              }
              autoFocus
            />
          </Field>
        </div>
        {projection?.goalDateIso ? (
          <div className="mt-6 card-tint p-5 scale-in-anim">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Projected pace
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="numerals text-3xl text-ink-2">
                {projection.weeklyLossKg.toFixed(1)}
              </span>
              <span className="text-sm text-muted">kg / week</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              You&apos;d reach goal around{" "}
              <span className="text-ink-2">
                {formatGoalDate(projection.goalDateIso)}
              </span>
              .
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-auto pt-8">
        <Button onClick={submit} size="lg" fullWidth disabled={!isValid}>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
