"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { BrandMark } from "../primitives";

const lines = [
  "Working out your daily calorie target...",
  "Setting protein to keep your muscle strong...",
  "Pacing your weekly weight change...",
  "Setting water and step goals...",
  "Wrapping up your plan.",
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
    <div className="relative flex h-full flex-col">
      <div className="mt-2 flex flex-col items-center text-center">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(0,143,208,0.55) 0%, transparent 65%)",
              filter: "blur(20px)",
              transform: "scale(1.7)",
            }}
          />
          <BrandMark size={84} color="cyan" strokeWidth={7} className="brand-spin-med" />
        </div>
        <span className="font-eyebrow mt-7 text-white/55">Building</span>
        <h2 className="mt-2 font-display text-[28px] leading-tight text-white">
          {name ? `Hold tight, ${name}.` : "Hold tight."}
        </h2>
        <p className="mt-2.5 text-[14.5px] text-white/65">
          We&apos;re engineering your plan from your numbers.
        </p>
      </div>
      <ul className="mt-9 space-y-2.5">
        {lines.map((line, idx) => {
          const done = idx < progress;
          const active = idx === progress;
          return (
            <li
              key={line}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all ${
                done || active ? "opacity-100" : "opacity-35"
              } ${active ? "border-[#00aef0]/40" : "border-white/12"}`}
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(0,143,208,0.16) 0%, rgba(0,60,83,0.20) 100%)"
                  : "rgba(255,255,255,0.04)",
              }}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                  done
                    ? "bg-[#00aef0] text-white shadow-[0_4px_10px_-2px_rgba(0,143,208,0.55)]"
                    : active
                      ? "bg-white/[0.10] text-[#00aef0] border border-[#00aef0]/40"
                      : "bg-white/[0.06] text-white/40 border border-white/10"
                }`}
                aria-hidden
              >
                {done ? (
                  <Check size={14} strokeWidth={3} />
                ) : active ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#00aef0]" />
                ) : null}
              </span>
              <span className={`text-sm ${active || done ? "text-white" : "text-white/65"}`}>{line}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
