"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";

const lines = [
  "Calculating your maintenance calories...",
  "Setting protein targets for muscle preservation...",
  "Designing your weekly weight-loss pace...",
  "Locking in water and step goals...",
  "Finishing your plan.",
];

const STEP_MS = 1500;

export function PlanCalculation({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [progress, setProgress] = useState(0);

  // Materialize the plan early so the reveal step has fresh targets.
  // Run exactly once, even when commitDraft causes app-state to rebuild
  // its memoized `actions` object (which would otherwise loop here).
  const committedRef = useRef(false);
  useEffect(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    actions.commitDraft();
  }, [actions]);

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

  // Keep the latest onNext in a ref so the navigation timeout below isn't
  // cancelled and rescheduled every time the parent re-renders (which
  // happens when commitDraft updates app-state).
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (progress >= lines.length) {
      const t = window.setTimeout(() => onNextRef.current(), 700);
      return () => window.clearTimeout(t);
    }
  }, [progress]);

  const name = onboardingExtras.name;

  return (
    <div className="flex h-full flex-col">
      <div className="mt-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Building
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          {name ? `Hold tight, ${name}.` : "Hold tight."}
        </h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;re tailoring your plan from your numbers.
        </p>
      </div>
      <ul className="mt-10 space-y-3">
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
