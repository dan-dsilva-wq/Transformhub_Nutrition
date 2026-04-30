"use client";

import { ArrowRight, Footprints, Droplet, Apple } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";

type PillarId = "steps" | "water" | "nutrition";

const pillars: {
  id: PillarId;
  icon: typeof Footprints;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
}[] = [
  {
    id: "steps",
    icon: Footprints,
    eyebrow: "Move",
    title: "10,000 steps a day",
    body: "Walking is the most under-rated weight-loss tool. It can add 200-400 kcal of easy burn without driving hunger.",
    accent: "linear-gradient(135deg,#a7f3d0,#0d9488)",
  },
  {
    id: "water",
    icon: Droplet,
    eyebrow: "Hydrate",
    title: "2 to 3 litres of water",
    body: "Half of \"hunger\" is mild dehydration. A consistent water target dampens cravings and keeps performance steady.",
    accent: "linear-gradient(135deg,#bae6fd,#0284c7)",
  },
  {
    id: "nutrition",
    icon: Apple,
    eyebrow: "Eat real",
    title: "Protein + fiber, every meal",
    body: "Protein protects muscle while you lose; fiber buys fullness for almost no calories. Build every plate around them.",
    accent: "linear-gradient(135deg,#fed7aa,#fb923c)",
  },
];

export function HabitPillars({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActive(idx);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function commit(id: PillarId, on: boolean) {
    actions.commitTo({ [id]: on });
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Three pillars
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          The habits that move the needle.
        </h2>
        <p className="mt-2 text-sm text-muted">
          Commit to the ones you&apos;re ready for. Your home screen will follow them.
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar mt-7 -mx-6 flex snap-x snap-mandatory overflow-x-auto px-6"
      >
        {pillars.map((p) => {
          const Icon = p.icon;
          const checked = onboardingExtras.commitments[p.id];
          return (
            <div
              key={p.id}
              className="pillar-fade-anim w-full shrink-0 snap-center pr-3 last:pr-0"
              style={{ flexBasis: "100%" }}
            >
              <div className="rounded-3xl border border-white/70 bg-white/55 p-5 shadow-card backdrop-blur-xl">
                <div
                  className="grid h-14 w-14 place-items-center rounded-2xl text-white"
                  style={{ background: p.accent }}
                >
                  <Icon size={26} aria-hidden />
                </div>
                <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  {p.eyebrow}
                </div>
                <h3 className="mt-1 font-display text-2xl text-ink-2">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
                <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm text-ink-2">
                  <span>I&apos;m in.</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-forest"
                    checked={checked}
                    onChange={(e) => commit(p.id, e.target.checked)}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {pillars.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-forest" : "w-1.5 bg-white/70"
            }`}
          />
        ))}
      </div>

      <div className="mt-auto pt-8">
        <Button onClick={onNext} size="lg" fullWidth>
          {active < pillars.length - 1 ? "I'll keep reading" : "Take me in"}{" "}
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
