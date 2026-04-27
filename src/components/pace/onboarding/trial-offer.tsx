"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";

const perks = [
  "Unlimited AI photo logging",
  "Tailored nutrition guide",
  "Coach without limits",
  "Full progress history + photo compare",
  "Apple Health, Google Fit & Strava sync",
  "Custom reminder schedules",
];

export function TrialOffer({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const name = onboardingExtras.name;

  function startTrial() {
    actions.startTrial();
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scale-in-anim">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3 py-1 text-[11px] font-medium text-forest backdrop-blur-xl">
          <Sparkles size={12} aria-hidden />
          Premium
        </span>
        <h2 className="mt-3 font-display text-3xl leading-tight text-ink-2">
          {name
            ? `${name}, your first 7 days are on us.`
            : "Your first 7 days are on us."}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Try every premium feature free. Cancel anytime — no payment is taken
          today.
        </p>
      </div>

      <ul className="mt-6 space-y-2">
        {perks.map((p) => (
          <li
            key={p}
            className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm text-ink-2 backdrop-blur-xl"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-forest">
              <Check size={14} aria-hidden />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col items-center gap-3 pt-8">
        <Button onClick={startTrial} size="lg" fullWidth>
          Start free trial <ArrowRight size={18} />
        </Button>
        <button
          type="button"
          onClick={onNext}
          className="text-xs text-muted hover:text-ink"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
