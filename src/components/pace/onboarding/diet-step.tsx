"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";
import type { DietaryPref } from "@/lib/state/types";

const options: { id: DietaryPref; label: string }[] = [
  { id: "omnivore", label: "Omnivore" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "no-dairy", label: "No dairy" },
  { id: "no-gluten", label: "No gluten" },
  { id: "no-peanuts", label: "No peanuts" },
  { id: "no-tree-nuts", label: "No tree nuts" },
  { id: "no-fish", label: "No fish" },
  { id: "no-shellfish", label: "No shellfish" },
  { id: "no-soy", label: "No soy" },
  { id: "no-eggs", label: "No eggs" },
  { id: "no-sesame", label: "No sesame" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export function DietStep({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [selected, setSelected] = useState<DietaryPref[]>(
    onboardingExtras.dietaryPreferences,
  );

  function toggle(id: DietaryPref) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    actions.setOnboardingExtras({ dietaryPreferences: selected });
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 6 · Diet
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          Anything we should keep off your plate?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Tap any that apply. Tailors your future food guide.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                data-tap
                onClick={() => toggle(o.id)}
                className={clsx(
                  "rounded-full border px-4 py-2 text-sm transition backdrop-blur-xl",
                  active
                    ? "border-forest bg-forest text-white"
                    : "border-white/70 bg-white/55 text-ink-2 hover:bg-white/75",
                )}
              >
                {o.label}
              </button>
            );
          })}
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
