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
    body: "Walking is the simplest weight-loss tool there is. An extra 200-400 calories burned, without making you hungrier.",
    accent: "linear-gradient(135deg, #00aef0 0%, #003c53 100%)",
  },
  {
    id: "water",
    icon: Droplet,
    eyebrow: "Hydrate",
    title: "2 to 3 litres of water",
    body: "Many cravings are really mild thirst. Drinking enough water settles cravings and keeps your energy steady.",
    accent: "linear-gradient(135deg, #66c8e8 0%, #008fd0 100%)",
  },
  {
    id: "nutrition",
    icon: Apple,
    eyebrow: "Eat well",
    title: "Protein + fibre, every meal",
    body: "Protein keeps your muscle strong while you lose weight. Fibre keeps you full for hardly any calories. Build every meal around them.",
    accent: "linear-gradient(135deg, #008fd0 0%, #003c53 100%)",
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
        <span className="font-eyebrow text-white/55">Three pillars</span>
        <h2 className="mt-2 font-display text-[28px] leading-tight text-white">
          The habits that move the needle.
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
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
              <div
                className="surface-deep p-5"
                style={{ borderRadius: 28 }}
              >
                <div
                  className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgba(0,143,208,0.55)]"
                  style={{ background: p.accent }}
                >
                  <Icon size={26} aria-hidden />
                </div>
                <div className="font-eyebrow mt-5 text-[#66c8e8]">
                  {p.eyebrow}
                </div>
                <h3 className="mt-1.5 font-display text-2xl text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">{p.body}</p>
                <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white">
                  <span className="font-semibold">I&apos;m in.</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#00aef0]"
                    checked={checked}
                    onChange={(e) => commit(p.id, e.target.checked)}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {pillars.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-[#00aef0]" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="mt-auto pt-8">
        <Button onClick={onNext} size="lg" fullWidth className="cyan-halo">
          {active < pillars.length - 1 ? "I'll keep reading" : "Take me in"}{" "}
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
