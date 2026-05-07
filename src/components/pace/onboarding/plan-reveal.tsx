"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { resolveGoalIntent } from "@/lib/targets";
import { Button, BrandMark } from "../primitives";

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
  const goalIntent = resolveGoalIntent(profile);
  const weeklyChange = targets.weeklyWeightChangeKg;
  const paceLabel =
    weeklyChange === 0
      ? "Hold steady"
      : weeklyChange < 0
        ? `${Math.abs(weeklyChange).toFixed(2)} kg / week loss`
        : `${weeklyChange.toFixed(2)} kg / week gain`;
  const macroTotal = Math.max(
    targets.proteinG + targets.carbsG + targets.fatG,
    1,
  );
  const ringPct = Math.min(targets.calories / 3500, 1);

  return (
    <div className="relative flex h-full flex-col">
      <div className="scale-in-anim relative z-10">
        <span className="font-eyebrow text-white/55">Your plan</span>
        <h2 className="mt-2 font-display text-[28px] leading-tight text-white">
          {name ? `${name}, this is your plan.` : "Here is your plan."}
        </h2>
      </div>

      {/* Hero ring — deep navy with brand mark behind a counted-up calorie target */}
      <div className="surface-deep mt-6 px-6 pt-7 pb-6">
        <div className="relative mx-auto flex h-[226px] w-[226px] items-center justify-center">
          {/* Brand mark behind, slowly rotating */}
          <div aria-hidden className="absolute inset-0 grid place-items-center brand-spin-slow opacity-20">
            <BrandMark size={210} color="cyan" strokeWidth={5} />
          </div>
          {/* Outer track */}
          <svg viewBox="0 0 220 220" className="absolute inset-0 -rotate-90">
            <defs>
              <linearGradient id="th-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00aef0" />
                <stop offset="60%" stopColor="#008fd0" />
                <stop offset="100%" stopColor="#003c53" />
              </linearGradient>
            </defs>
            <circle
              cx="110"
              cy="110"
              r="98"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="110"
              cy="110"
              r="98"
              stroke="url(#th-ring-grad)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 98}`}
              strokeDashoffset={`${2 * Math.PI * 98 * (1 - ringPct)}`}
              style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
            />
          </svg>
          {/* Sheen sweep */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            style={{ mask: "radial-gradient(circle, transparent 88px, #000 90px, #000 108px, transparent 110px)", WebkitMask: "radial-gradient(circle, transparent 88px, #000 90px, #000 108px, transparent 110px)" }}
          >
            <span
              className="sheen-pass-anim absolute top-0 h-full w-1/3"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
              }}
            />
          </div>
          {/* Centre numerals */}
          <div className="relative text-center text-white">
            <div className="font-eyebrow text-white/55">Daily target</div>
            <div className="numerals mt-1 text-[56px] leading-none text-white">{counted.toLocaleString()}</div>
            <div className="font-eyebrow mt-1 text-white/45">kcal</div>
          </div>
        </div>

        {/* Brand stripe under ring */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/55">
          <span className="h-px w-8 bg-white/25" />
          Engineered for {goalIntent === "maintain" ? "maintenance" : goalIntent === "build-muscle" ? "muscle growth" : goalIntent === "lose" ? "fat loss" : "performance"}
          <span className="h-px w-8 bg-white/25" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <MacroBar tone="forest" label="Protein" value={targets.proteinG} total={macroTotal} />
        <MacroBar tone="sky" label="Carbs" value={targets.carbsG} total={macroTotal} />
        <MacroBar tone="clay" label="Fats" value={targets.fatG} total={macroTotal} />
        <MacroBar tone="sage" label="Fiber" value={targets.fiberG} total={Math.max(targets.fiberG, 1)} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <span className="font-eyebrow text-white/55">Pace</span>
          <span className="text-xs text-white/65">{paceLabel}</span>
        </div>
        <div className="mt-1.5 text-[14px] text-white/85 leading-relaxed">
          {goalIntent === "maintain" || goalIntent === "build-muscle" ? (
            "Your plan holds weight steady while your habits do the work."
          ) : (
            <>
              You&apos;d reach <span className="numerals text-white">{profile.goalWeightKg} kg</span>{" "}
              {goalDate ? (
                <>
                  around <span style={{ color: "#00aef0" }}>{goalDate}</span>.
                </>
              ) : (
                "at this pace."
              )}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="mt-4 self-start text-xs font-semibold uppercase tracking-[0.18em] text-[#00aef0] hover:text-[#33b8e8]"
      >
        {expanded ? "Hide rationale" : "Why this works"}
      </button>
      {expanded ? (
        <ul className="mt-2 space-y-1.5 text-xs text-white/70">
          {targets.notes.map((n) => (
            <li key={n} className="flex gap-2"><span className="text-[#00aef0]">+</span>{n}</li>
          ))}
          {targets.deficit > 0 ? (
            <li className="flex gap-2">
              <span className="text-[#00aef0]">+</span>
              You&apos;ll be eating about {Math.round(targets.deficit)} calories below your daily burn.
              We won&apos;t go any lower than that to keep you fuelled.
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-auto pt-8">
        <Button onClick={onNext} size="lg" fullWidth className="cyan-halo">
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
      ? "linear-gradient(90deg, #00aef0, #008fd0)"
      : tone === "sky"
        ? "linear-gradient(90deg, #66c8e8, #008fd0)"
        : tone === "clay"
          ? "linear-gradient(90deg, #f0b96b, #ec6f5e)"
          : "linear-gradient(90deg, #00d2a8, #00b894)";
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 backdrop-blur-xl">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
      <div className="numerals mt-0.5 text-base text-white">
        {Math.round(value)}
        <span className="ml-0.5 text-[11px] text-white/55">g</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  );
}
