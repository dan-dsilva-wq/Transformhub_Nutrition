"use client";

import {
  ArrowRight,
  Bot,
  Camera,
  LineChart,
  Search,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";

const features = [
  {
    icon: Camera,
    title: "Photo food logging",
    body: "Snap a meal, review the estimate, then save it when it looks right.",
  },
  {
    icon: Search,
    title: "Type food logging",
    body: "No photo needed. Type pizza, coffee, oats, or anything else you ate.",
  },
  {
    icon: Bot,
    title: "AI coach",
    body: "Ask for help with meals, targets, habits, and what to do next.",
  },
  {
    icon: Target,
    title: "Daily targets",
    body: "Calories, protein, carbs, fat, fiber, water, and steps stay visible.",
  },
  {
    icon: LineChart,
    title: "Progress tracking",
    body: "Weigh-ins and photos show the trend without obsessing over one day.",
  },
  {
    icon: SlidersHorizontal,
    title: "Plan controls",
    body: "Change goal, pace, activity, meals, and reminders when life changes.",
  },
];

export function FeatureTour({ onNext }: { onNext: () => void }) {
  const { actions } = useAppState();

  function finish() {
    actions.completeTour();
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Quick tour
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          What Pace does for you.
        </h2>
        <p className="mt-2 text-sm text-muted">
          See the useful parts first. Then you can decide whether premium is worth it.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/70 bg-white/60 p-3 backdrop-blur-xl"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-forest">
                <Icon size={17} aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink-2">{feature.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{feature.body}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <Button onClick={finish} size="lg" fullWidth>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
