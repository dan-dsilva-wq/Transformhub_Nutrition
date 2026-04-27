"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { Button, ProgressRing } from "../primitives";

function formatGoalDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function PlanReveal({ onNext }: { onNext: () => void }) {
  const { targets, profile, onboardingExtras } = useAppState();
  const [counted, setCounted] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const target = targets.calories;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setCounted(Math.round(target * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targets.calories]);

  const name = onboardingExtras.name;
  const goalDate = formatGoalDate(onboardingExtras.goalDateIso);
  const macroTotal = Math.max(
    targets.proteinG + targets.carbsG + targets.fatG,
    1,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="scale-in-anim">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Your plan
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          {name ? `${name}, this is your plan.` : "Here is your plan."}
        </h2>
      </div>

      <div className="mt-7 flex justify-center">
        <ProgressRing
          value={1}
          size={208}
          stroke={14}
          ariaLabel="Daily calorie target"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Daily target
          </div>
          <div className="numerals mt-1 text-5xl text-ink-2">{counted}</div>
          <div className="text-xs text-muted">kcal</div>
        </ProgressRing>
      </div>

      <div className="mt-7 grid grid-cols-4 gap-2">
        <MacroBar
          tone="forest"
          label="Protein"
          value={targets.proteinG}
          total={macroTotal}
        />
        <MacroBar
          tone="sky"
          label="Carbs"
          value={targets.carbsG}
          total={macroTotal}
        />
        <MacroBar
          tone="clay"
          label="Fats"
          value={targets.fatG}
          total={macroTotal}
        />
        <MacroBar
          tone="sage"
          label="Fiber"
          value={targets.fiberG}
          total={Math.max(targets.fiberG, 1)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Pace
          </span>
          <span className="text-xs text-muted">
            {targets.weeklyLossKg.toFixed(1)} kg / week
          </span>
        </div>
        <div className="mt-1 text-sm text-ink-2">
          You&apos;d reach{" "}
          <span className="numerals">{profile.goalWeightKg} kg</span>{" "}
          {goalDate ? (
            <>
              around <span className="text-forest">{goalDate}</span>.
            </>
          ) : (
            "at this pace."
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="mt-4 self-start text-xs font-medium text-forest hover:text-forest-2"
      >
        {expanded ? "Hide" : "Why this works"}
      </button>
      {expanded ? (
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {targets.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
          <li>
            · A {Math.round(targets.deficit)} kcal daily deficit is the largest
            we&apos;ll allow without burning through lean muscle.
          </li>
        </ul>
      ) : null}

      <div className="mt-auto pt-8">
        <Button onClick={onNext} size="lg" fullWidth>
          Show me how to win <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

function MacroBar({
  tone,
  label,
  value,
  total,
}: {
  tone: "forest" | "sky" | "clay" | "sage";
  label: string;
  value: number;
  total: number;
}) {
  const pct = Math.min(100, (value / total) * 100);
  const fill =
    tone === "forest"
      ? "var(--color-forest)"
      : tone === "sky"
        ? "var(--color-sky)"
        : tone === "clay"
          ? "var(--color-clay)"
          : "var(--color-sage)";
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-3 backdrop-blur-xl">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="numerals mt-0.5 text-base text-ink-2">
        {Math.round(value)}
        <span className="ml-0.5 text-[11px] text-muted">g</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/70">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  );
}
