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
        <span className="font-eyebrow text-white/55">Quick tour</span>
        <h2 className="mt-2 font-display text-[28px] leading-tight text-white">
          What Transform Hub does for you.
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
          See the useful parts first. Then you can decide whether premium is worth it.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="relative overflow-hidden rounded-2xl border border-white/12 p-3.5 backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(160deg, rgba(0,143,208,0.08) 0%, rgba(0,38,53,0.30) 100%)",
              }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-[#00aef0]"
                style={{
                  background: "rgba(0,174,240,0.12)",
                  border: "1px solid rgba(0,174,240,0.30)",
                }}
              >
                <Icon size={17} aria-hidden />
              </span>
              <h3 className="mt-3 text-[13.5px] font-semibold text-white">{feature.title}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">{feature.body}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <Button onClick={finish} size="lg" fullWidth className="cyan-halo">
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
