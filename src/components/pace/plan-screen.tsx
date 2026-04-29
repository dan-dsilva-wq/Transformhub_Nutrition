"use client";

import { useMemo, useState } from "react";
import { Check, Pencil } from "lucide-react";
import {
  calculateDailyTargets,
  type ActivityLevel,
  type SexForCalories,
} from "@/lib/targets";
import { useAppState } from "@/lib/state/app-state";
import {
  Button,
  Card,
  Field,
  Input,
  SectionHeader,
  Select,
  Stat,
} from "./primitives";

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Light — some walking",
  moderate: "Moderate — daily activity",
  active: "Active — regular hard work",
};

const sexLabels: Record<SexForCalories, string> = {
  female: "Female",
  male: "Male",
};

export function PlanScreen() {
  const { profile, targets, draft, actions } = useAppState();
  const [editing, setEditing] = useState(false);

  const previewTargets = useMemo(() => {
    if (!editing) return targets;
    try {
      return calculateDailyTargets({
        age: Number(draft.age) || profile.age,
        sexForCalories: draft.sexForCalories,
        heightCm: Number(draft.heightCm) || profile.heightCm,
        currentWeightKg:
          Number(draft.currentWeightKg) || profile.currentWeightKg,
        goalWeightKg: Number(draft.goalWeightKg) || profile.goalWeightKg,
        activityLevel: draft.activityLevel,
        baselineSteps: Number(draft.baselineSteps) || profile.baselineSteps,
        workoutsPerWeek:
          Number(draft.workoutsPerWeek) || profile.workoutsPerWeek,
      });
    } catch {
      return targets;
    }
  }, [editing, draft, profile, targets]);

  function save() {
    actions.commitDraft();
    setEditing(false);
  }

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU &amp; TARGETS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          You &amp; your <span className="text-forest">targets.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Update your basics &mdash; height, weight, goal &mdash; and we&rsquo;ll
          recalculate the maths behind your day.
        </p>
      </header>

      <Card>
        <SectionHeader eyebrow="Daily targets" title="What we're aiming at" />
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Calories" value={previewTargets.calories} hint="kcal" />
          <Stat label="Protein" value={`${previewTargets.proteinG}g`} hint="for muscle" />
          <Stat label="Carbs" value={`${previewTargets.carbsG}g`} />
          <Stat label="Fats" value={`${previewTargets.fatG}g`} />
          <Stat label="Fiber" value={`${previewTargets.fiberG}g`} />
          <Stat label="Water" value={`${(previewTargets.waterMl / 1000).toFixed(1)}L`} />
          <Stat label="Steps" value={previewTargets.steps.toLocaleString()} />
          <Stat label="Pace" value={`${previewTargets.weeklyLossKg.toFixed(2)}kg/wk`} />
        </div>
        {previewTargets.notes.length > 0 ? (
          <ul className="mt-4 space-y-1 text-xs text-muted">
            {previewTargets.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 inline-block h-1 w-1 shrink-0 rounded-full bg-sage" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {!editing ? (
        <Button
          size="lg"
          fullWidth
          variant="secondary"
          onClick={() => setEditing(true)}
        >
          <Pencil size={16} aria-hidden /> Edit plan inputs
        </Button>
      ) : (
        <Card>
          <SectionHeader eyebrow="Inputs" title="Tell me more" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.age}
                  onChange={(e) =>
                    actions.setDraft({ ...draft, age: e.target.value })
                  }
                />
              </Field>
              <Field label="Sex (calories)">
                <Select
                  value={draft.sexForCalories}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      sexForCalories: e.target.value as SexForCalories,
                    })
                  }
                >
                  {Object.entries(sexLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.heightCm}
                  onChange={(e) =>
                    actions.setDraft({ ...draft, heightCm: e.target.value })
                  }
                />
              </Field>
              <Field label="Activity">
                <Select
                  value={draft.activityLevel}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      activityLevel: e.target.value as ActivityLevel,
                    })
                  }
                >
                  {Object.entries(activityLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current weight (kg)">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={draft.currentWeightKg}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      currentWeightKg: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Goal weight (kg)">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={draft.goalWeightKg}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      goalWeightKg: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Baseline steps/day">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.baselineSteps}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      baselineSteps: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Workouts/week">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.workoutsPerWeek}
                  onChange={(e) =>
                    actions.setDraft({
                      ...draft,
                      workoutsPerWeek: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button onClick={save} fullWidth>
              <Check size={18} aria-hidden /> Save plan
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
