"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAppState } from "@/lib/state/app-state";

interface TourStep {
  selector: string;
  title: string;
  body: string;
  placement: "below" | "above";
}

const steps: TourStep[] = [
  {
    selector: "[data-tour='today-header']",
    title: "Your day at a glance",
    body: "Calories, protein, water and steps — only what matters today.",
    placement: "below",
  },
  {
    selector: "[data-tour='log-button']",
    title: "Snap or search to log a meal",
    body: "Tap the green + any time. Photo, search, or barcode.",
    placement: "above",
  },
  {
    selector: "[data-tour='drawer-trigger']",
    title: "Coach, plan, food guide",
    body: "Everything else lives in here. Your initials open it.",
    placement: "below",
  },
  {
    selector: "[data-tour='progress-tab']",
    title: "We track the line, not the day",
    body: "Weigh-ins move; what we look for is the trend.",
    placement: "above",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function AppTour() {
  const { hasOnboarded, onboardingExtras, actions } = useAppState();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const active = hasOnboarded && !onboardingExtras.hasSeenTour;

  // Lock body scroll while the tour is showing.
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);

  // Measure target whenever step changes or window resizes.
  useLayoutEffect(() => {
    if (!active) return;
    function measure() {
      const step = steps[index];
      if (!step) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, index]);

  if (!active) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  function next() {
    if (isLast) {
      actions.completeTour();
      return;
    }
    setIndex((i) => i + 1);
  }
  function skip() {
    actions.completeTour();
  }

  // Tooltip positioning — defaults to centered if no rect.
  const padding = 8;
  const tooltipTop = !rect
    ? typeof window !== "undefined"
      ? window.innerHeight / 2 - 80
      : 200
    : step.placement === "below"
      ? rect.top + rect.height + padding + 6
      : rect.top - padding - 130;

  return (
    <div className="fade-anim fixed inset-0 z-[60]" aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Continue tour"
        onClick={next}
        className="absolute inset-0 cursor-pointer bg-transparent"
      />
      {rect ? (
        <div
          aria-hidden
          className="pulse-ring-anim pointer-events-none absolute rounded-[20px]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15,23,20,0.55)",
            border: "2px solid rgba(255,255,255,0.85)",
            transition:
              "top 280ms cubic-bezier(.2,.8,.2,1), left 280ms cubic-bezier(.2,.8,.2,1), width 280ms cubic-bezier(.2,.8,.2,1), height 280ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(15,23,20,0.55)" }}
        />
      )}

      <div
        key={index}
        className="pop-in-anim absolute left-1/2 z-[61] w-[min(360px,90vw)] -translate-x-1/2 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-elevated backdrop-blur-2xl"
        style={{
          top: tooltipTop,
          transition: "top 280ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          <span>
            Tour · {index + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={skip}
            className="text-xs normal-case tracking-normal text-muted hover:text-ink"
          >
            Skip tour
          </button>
        </div>
        <h3 className="mt-2 font-display text-xl text-ink-2">{step.title}</h3>
        <p className="mt-1 text-sm text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-forest" : "w-1.5 bg-stone-2"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            data-tap
            onClick={next}
            className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest-2"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
