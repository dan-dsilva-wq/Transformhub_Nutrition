"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import {
  HIGH_WEEKLY_LOSS_KG,
  calculateDailyTargets,
  suggestedGoalWeightKg,
  type GoalIntent,
} from "@/lib/targets";
import { Button, Field, Input } from "../primitives";
import type { ProfileDraft } from "@/lib/state/types";

const goalOptions: Array<{
  id: GoalIntent;
  title: string;
  body: string;
}> = [
  { id: "lose", title: "Lose weight", body: "Use a weekly loss pace you choose." },
  { id: "maintain", title: "Maintain", body: "Hold weight steady and keep habits consistent." },
  { id: "gain", title: "Gain weight", body: "Add a modest surplus for steady gain." },
  { id: "build-muscle", title: "Build muscle", body: "Keep weight steady with high protein targets." },
];

const paceOptions = [
  { label: "Slow", value: 0.25 },
  { label: "Moderate", value: 0.5 },
  { label: "Fast", value: 0.75 },
] as const;

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

function defaultRate(goalIntent: GoalIntent) {
  if (goalIntent === "lose") return 0.5;
  if (goalIntent === "gain") return 0.25;
  return 0;
}

export function GoalStep({ onNext }: { onNext: () => void }) {
  const { draft, actions } = useAppState();
  const [local, setLocal] = useState<ProfileDraft>(() => {
    const current = Number(draft.currentWeightKg) || 80;
    const intent = draft.goalIntent ?? "lose";
    const goal = Number(draft.goalWeightKg) || 0;
    const shouldSuggest =
      goal <= 0 ||
      (intent === "lose" && goal >= current) ||
      (intent === "gain" && goal <= current) ||
      ((intent === "maintain" || intent === "build-muscle") && goal !== current);

    return {
      ...draft,
      goalIntent: intent,
      goalWeightKg: String(shouldSuggest ? suggestedGoalWeightKg(current, intent) : goal),
      weeklyRateKg: draft.weeklyRateKg || String(defaultRate(intent)),
    };
  });
  const [customOpen, setCustomOpen] = useState(
    local.goalIntent === "lose" &&
      !paceOptions.some((option) => option.value === Number(local.weeklyRateKg)),
  );

  const goalIntent = local.goalIntent;
  const currentWeightKg = Number(local.currentWeightKg) || 80;
  const goalWeightKg = Number(local.goalWeightKg) || 0;
  const weeklyRateKg = Number(local.weeklyRateKg) || 0;
  const isWeightChangeGoal = goalIntent === "lose" || goalIntent === "gain";

  const projection = useMemo(() => {
    try {
      const profile = {
        age: Number(local.age) || 30,
        sexForCalories: local.sexForCalories,
        heightCm: Number(local.heightCm) || 170,
        currentWeightKg: Number(local.currentWeightKg) || 80,
        goalWeightKg: Number(local.goalWeightKg) || 0,
        goalIntent: local.goalIntent,
        weeklyRateKg: Number(local.weeklyRateKg) || defaultRate(local.goalIntent),
        activityLevel: local.activityLevel,
        baselineSteps: Number(local.baselineSteps) || 5000,
        workoutsPerWeek: Number(local.workoutsPerWeek) || 3,
      };
      if (profile.goalWeightKg <= 0) return null;
      const targets = calculateDailyTargets(profile);
      const weeklyChange = targets.weeklyWeightChangeKg;
      const distanceKg = Math.abs(profile.currentWeightKg - profile.goalWeightKg);
      const days =
        distanceKg > 0 && Math.abs(weeklyChange) > 0
          ? (distanceKg / Math.abs(weeklyChange)) * 7
          : 0;

      return {
        calories: targets.calories,
        weeklyChange,
        weeklyLossKg: targets.weeklyLossKg,
        goalDateIso: days > 0 ? isoDateAddDays(days) : undefined,
      };
    } catch {
      return null;
    }
  }, [local]);

  const isValidGoal =
    goalWeightKg > 0 &&
    (goalIntent === "lose"
      ? goalWeightKg < currentWeightKg
      : goalIntent === "gain"
        ? goalWeightKg > currentWeightKg
        : true);
  const isValidRate =
    goalIntent === "lose" ? weeklyRateKg >= 0.1 && weeklyRateKg <= 1.2 : true;
  const isValid = isValidGoal && isValidRate;

  function setGoalIntent(nextIntent: GoalIntent) {
    const nextGoal = suggestedGoalWeightKg(currentWeightKg, nextIntent);
    setCustomOpen(false);
    setLocal({
      ...local,
      goalIntent: nextIntent,
      goalWeightKg: String(nextGoal),
      weeklyRateKg: String(defaultRate(nextIntent)),
    });
  }

  function submit() {
    if (!isValid) return;
    actions.setDraft(local);
    actions.setOnboardingExtras({ goalDateIso: projection?.goalDateIso });
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 3 · Goal
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          What are you aiming for?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Pick the outcome you want, then choose your pace. We won&apos;t let your calories drop too low for your safety.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {goalOptions.map((option) => {
            const active = goalIntent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-tap
                onClick={() => setGoalIntent(option.id)}
                className={`relative rounded-2xl border px-3.5 py-3.5 text-left transition ${
                  active
                    ? "border-[#00aef0] text-white shadow-[0_8px_24px_-8px_rgba(0,143,208,0.55)]"
                    : "border-white/12 text-white/65 hover:border-white/25 hover:text-white"
                }`}
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(0,143,208,0.22) 0%, rgba(0,60,83,0.30) 100%)"
                    : "rgba(255,255,255,0.04)",
                }}
                aria-pressed={active}
              >
                <span className="block text-[13.5px] font-semibold">{option.title}</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed">{option.body}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <Field
            label={isWeightChangeGoal ? "Goal weight (kg)" : "Target weight (kg)"}
            hint={
              goalIntent === "lose"
                ? "A number a little below where you are now."
                : goalIntent === "gain"
                  ? "A number a little above where you are now."
                  : "Used to show your charts and progress."
            }
          >
            <Input
              inputMode="decimal"
              value={local.goalWeightKg}
              onChange={(e) => setLocal({ ...local, goalWeightKg: e.target.value })}
              autoFocus
            />
          </Field>
        </div>

        {goalIntent === "lose" ? (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Weekly pace
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1 backdrop-blur-xl">
              {paceOptions.map((option) => {
                const active = !customOpen && weeklyRateKg === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    data-tap
                    onClick={() => {
                      setCustomOpen(false);
                      setLocal({ ...local, weeklyRateKg: String(option.value) });
                    }}
                    className={`rounded-full px-2 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-[#00aef0] text-white shadow-[0_4px_14px_-2px_rgba(0,143,208,0.55)]"
                        : "text-white/55 hover:text-white"
                    }`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                data-tap
                onClick={() => setCustomOpen(true)}
                className={`rounded-full px-2 py-2 text-xs font-semibold transition ${
                  customOpen
                    ? "bg-[#00aef0] text-white shadow-[0_4px_14px_-2px_rgba(0,143,208,0.55)]"
                    : "text-white/55 hover:text-white"
                }`}
                aria-pressed={customOpen}
              >
                Custom
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Current pace: {weeklyRateKg.toFixed(2)} kg/week.
            </p>
            {customOpen ? (
              <Field label="Custom kg/week" hint="Allowed range: 0.1 to 1.2 kg/week." className="mt-3">
                <Input
                  inputMode="decimal"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.2"
                  value={local.weeklyRateKg}
                  onChange={(e) => setLocal({ ...local, weeklyRateKg: e.target.value })}
                />
              </Field>
            ) : null}
            {weeklyRateKg > HIGH_WEEKLY_LOSS_KG ? (
              <p className="mt-3 rounded-2xl border border-[#ec6f5e]/40 bg-[#ec6f5e]/[0.10] px-3 py-2 text-xs text-[#f29080]">
                This is a fast pace. Most healthy guidance suggests 0.5 to 1.0 kg per week. We&apos;ll always keep your calories above a safe minimum.
              </p>
            ) : null}
          </div>
        ) : null}

        {projection ? (
          <div className="mt-6 card-tint p-5 scale-in-anim">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Preview
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="numerals text-3xl text-ink-2">
                {projection.weeklyChange === 0
                  ? "0.0"
                  : Math.abs(projection.weeklyChange).toFixed(2)}
              </span>
              <span className="text-sm text-muted">kg / week</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Daily target: <span className="text-ink-2">{projection.calories} kcal</span>
              {projection.goalDateIso ? (
                <>
                  . Goal around{" "}
                  <span className="text-ink-2">{formatGoalDate(projection.goalDateIso)}</span>.
                </>
              ) : (
                "."
              )}
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
