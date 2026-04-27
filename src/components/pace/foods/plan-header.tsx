"use client";

import type { DailyTargets } from "@/lib/targets";
import { Card } from "../primitives";

export function PlanHeader({
  name,
  mealsPerDay,
  dietaryLabel,
  targets,
}: {
  name?: string;
  mealsPerDay: number;
  dietaryLabel: string;
  targets: DailyTargets;
}) {
  const headline = name ? `Your eating plan, ${name}.` : "Your eating plan.";
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · YOUR PLATE
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          {headline.replace(/\.$/, "")}
          <span className="text-forest">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Built from your foods, your targets, your day.
        </p>
      </header>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Daily targets
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Aim for these across {mealsPerDay} meal{mealsPerDay === 1 ? "" : "s"}.
            </p>
          </div>
          <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] text-muted backdrop-blur">
            {dietaryLabel}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-5 gap-2">
          <Pill label="kcal" value={targets.calories} />
          <Pill label="P" value={targets.proteinG} suffix="g" />
          <Pill label="C" value={targets.carbsG} suffix="g" />
          <Pill label="F" value={targets.fatG} suffix="g" />
          <Pill label="Fib" value={targets.fiberG} suffix="g" />
        </ul>
      </Card>
    </div>
  );
}

function Pill({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <li className="rounded-2xl border border-white/70 bg-white/55 px-2 py-2 text-center backdrop-blur-xl">
      <div className="numerals text-base text-ink-2">
        {Math.round(value)}
        {suffix ?? ""}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
    </li>
  );
}
