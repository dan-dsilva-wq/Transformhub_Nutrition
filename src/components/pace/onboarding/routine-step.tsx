"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { Button, Field, Input, Select } from "../primitives";

export function RoutineStep({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [wakeAt, setWakeAt] = useState(
    onboardingExtras.routine?.wakeAt ?? "07:00",
  );
  const [sleepAt, setSleepAt] = useState(
    onboardingExtras.routine?.sleepAt ?? "23:00",
  );
  const [meals, setMeals] = useState(
    String(onboardingExtras.routine?.mealsPerDay ?? 3),
  );

  function submit() {
    actions.setOnboardingExtras({
      routine: {
        wakeAt,
        sleepAt,
        mealsPerDay: Number(meals) || 3,
      },
    });
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 5 · Routine
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          When does your day run?
        </h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll time gentle nudges and water reminders around this.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Field label="Wake">
            <Input
              type="time"
              value={wakeAt}
              onChange={(e) => setWakeAt(e.target.value)}
            />
          </Field>
          <Field label="Sleep">
            <Input
              type="time"
              value={sleepAt}
              onChange={(e) => setSleepAt(e.target.value)}
            />
          </Field>
          <Field label="Meals per day" className="col-span-2">
            <Select value={meals} onChange={(e) => setMeals(e.target.value)}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </Select>
          </Field>
        </div>
      </div>
      <div className="mt-auto pt-8">
        <Button onClick={submit} size="lg" fullWidth>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
