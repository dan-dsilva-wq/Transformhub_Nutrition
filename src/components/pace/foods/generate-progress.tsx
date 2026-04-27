"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { buildFallbackPlan } from "@/lib/nutrition-copy";
import type { NutritionPlan } from "@/lib/state/types";
import type { NutritionPlanResponse } from "@/lib/ai/schemas";

const lines = [
  "Reading your numbers…",
  "Choosing your protein anchor…",
  "Sizing your plate…",
  "Sequencing your day…",
  "Personalising your guide…",
];

const STEP_MS = 1200;
const AI_TIMEOUT_MS = 4500;

export function GenerateProgress({ onDone }: { onDone: () => void }) {
  const { targets, onboardingExtras, approvedFoods, actions } = useAppState();
  const [progress, setProgress] = useState(0);

  const aiCopyRef = useRef<NutritionPlan["copy"] | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    void (async () => {
      try {
        const res = await fetch("/api/ai/nutrition-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: onboardingExtras.name,
            targets: {
              calories: targets.calories,
              proteinG: targets.proteinG,
              carbsG: targets.carbsG,
              fatG: targets.fatG,
              fiberG: targets.fiberG,
              waterMl: targets.waterMl,
            },
            mealsPerDay: onboardingExtras.routine?.mealsPerDay ?? 3,
            dietaryPreferences: onboardingExtras.dietaryPreferences,
            approvedFoods,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { copy: NutritionPlanResponse };
        aiCopyRef.current = data.copy;
      } catch {
        /* swallow — fall back below */
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [targets, onboardingExtras, approvedFoods]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((p) => {
        if (p >= lines.length) {
          window.clearInterval(interval);
          return p;
        }
        return p + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < lines.length) return;
    if (finishedRef.current) return;
    finishedRef.current = true;

    const t = window.setTimeout(() => {
      const copy =
        aiCopyRef.current ??
        buildFallbackPlan({
          name: onboardingExtras.name,
          targets,
          mealsPerDay: onboardingExtras.routine?.mealsPerDay ?? 3,
          prefs: onboardingExtras.dietaryPreferences,
          approvedFoods,
        });

      const plan: NutritionPlan = {
        generatedAtIso: new Date().toISOString(),
        basis: {
          calories: targets.calories,
          proteinG: targets.proteinG,
          mealsPerDay: onboardingExtras.routine?.mealsPerDay ?? 3,
          dietaryPreferences: onboardingExtras.dietaryPreferences,
        },
        copy,
        lessonsCompleted: [],
      };
      actions.setNutritionPlan(plan);
      onDone();
    }, 600);

    return () => window.clearTimeout(t);
  }, [progress, actions, targets, onboardingExtras, approvedFoods, onDone]);

  const name = onboardingExtras.name;

  return (
    <div className="stagger-up flex h-full flex-col">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Generating
        </p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          {name ? `Hold tight, ${name}.` : "Hold tight."}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Tailoring your plan from your numbers and food list.
        </p>
      </div>
      <ul className="mt-8 space-y-3">
        {lines.map((line, idx) => {
          const done = idx < progress;
          const active = idx === progress;
          return (
            <li
              key={line}
              className={`flex items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 backdrop-blur-xl transition-opacity ${
                done || active ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                  done
                    ? "bg-forest text-white"
                    : active
                      ? "bg-cream text-forest"
                      : "bg-white/60 text-faint"
                }`}
                aria-hidden
              >
                {done ? (
                  <Check size={14} />
                ) : active ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-forest" />
                ) : null}
              </span>
              <span className="text-sm text-ink-2">{line}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
