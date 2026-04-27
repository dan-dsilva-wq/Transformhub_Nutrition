"use client";

import { Dumbbell, Footprints } from "lucide-react";
import type { EquipmentPreference } from "@/lib/targets";
import {
  createBusyHomeWorkoutPlan,
  type WorkoutDay,
} from "@/lib/targets";
import { useAppState } from "@/lib/state/app-state";
import {
  Card,
  Field,
  IconBadge,
  SectionHeader,
  Select,
} from "./primitives";
import { LockedState } from "./paywall-sheet";

const intensityTone: Record<WorkoutDay["intensity"], string> = {
  easy: "bg-sage/15 text-sage",
  moderate: "bg-amber/15 text-amber",
  hard: "bg-clay/15 text-clay",
};

export function WorkoutsScreen() {
  const { workoutPlan, draft, actions } = useAppState();

  function setEquipment(eq: EquipmentPreference) {
    actions.setDraft({ ...draft, equipment: eq });
    // We can't trigger commit here since user hasn't confirmed plan changes,
    // but workout plan only depends on equipment so we can preview live.
  }

  // Live preview from current equipment selection if it differs from saved plan.
  const livePlan =
    draft.equipment !== inferEquipmentFromPlan(workoutPlan)
      ? createBusyHomeWorkoutPlan(draft.equipment)
      : workoutPlan;

  return (
    <LockedState feature="workouts">
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · WORKOUTS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Move <span className="text-forest">a little.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Five short sessions, designed for a busy week. Walking counts.
        </p>
      </header>

      <Card>
        <Field
          label="Equipment"
          hint="The plan adjusts the resistance moves to fit."
        >
          <Select
            value={draft.equipment}
            onChange={(e) =>
              setEquipment(e.target.value as EquipmentPreference)
            }
          >
            <option value="none">No equipment</option>
            <option value="bands">Resistance bands</option>
            <option value="dumbbells">Dumbbells</option>
          </Select>
        </Field>
      </Card>

      <section>
        <SectionHeader eyebrow="This week" title="Your plan" />
        <ul className="space-y-3">
          {livePlan.map((day) => (
            <li key={day.day}>
              <Card className="!p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <IconBadge tone="forest">
                      {day.intensity === "easy" ? (
                        <Footprints size={18} aria-hidden />
                      ) : (
                        <Dumbbell size={18} aria-hidden />
                      )}
                    </IconBadge>
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                        {day.day}
                      </div>
                      <h3 className="font-display text-lg text-ink-2">
                        {day.focus}
                      </h3>
                      <div className="mt-0.5 text-xs text-muted">
                        {day.durationMinutes} min
                      </div>
                    </div>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize " +
                      intensityTone[day.intensity]
                    }
                  >
                    {day.intensity}
                  </span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {day.exercises.map((ex) => (
                    <li
                      key={ex}
                      className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-ink-2 backdrop-blur"
                    >
                      {ex}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </LockedState>
  );
}

function inferEquipmentFromPlan(plan: WorkoutDay[]): EquipmentPreference {
  const all = plan.flatMap((d) => d.exercises).join(" ").toLowerCase();
  if (all.includes("dumbbell")) return "dumbbells";
  if (all.includes("band")) return "bands";
  return "none";
}
