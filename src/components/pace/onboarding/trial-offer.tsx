"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { BILLING_ENABLED } from "@/lib/billing/config";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";

const perks = [
  "Unlimited photo food logging",
  "Your tailored 7-day food guide",
  "Ask the coach anytime",
  "Full progress history & side-by-side photos",
  "Custom meal & water reminders",
  "Cancel any time, no contract",
];

export function TrialOffer({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [busy, setBusy] = useState(false);
  const name = onboardingExtras.name;

  async function startTrial() {
    setBusy(true);
    const ok = await actions.startTrial();
    setBusy(false);
    if (ok || !BILLING_ENABLED) onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scale-in-anim">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.20em]"
          style={{
            background: "linear-gradient(135deg, rgba(0,143,208,0.20), rgba(0,60,83,0.40))",
            border: "1px solid rgba(0,174,240,0.40)",
            color: "#00aef0",
          }}
        >
          <Sparkles size={12} aria-hidden />
          Performance Tier
        </span>
        <h2 className="mt-4 font-display text-[32px] leading-tight text-white">
          {name
            ? `${name}, your first 7 days are on us.`
            : "Your first 7 days are on us."}
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
          Try every premium feature free. Cancel anytime — no payment is taken
          today.
        </p>
      </div>

      <ul className="mt-6 space-y-2">
        {perks.map((p) => (
          <li
            key={p}
            className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[14px] text-white/90 backdrop-blur-xl"
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#00aef0,#008fd0)" }}
            >
              <Check size={14} aria-hidden strokeWidth={3} />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col items-center gap-3 pt-8">
        <Button onClick={startTrial} size="lg" fullWidth loading={busy} className="cyan-halo">
          Start free trial <ArrowRight size={18} />
        </Button>
        <button
          type="button"
          onClick={onNext}
          className="text-xs uppercase tracking-[0.20em] text-white/45 hover:text-white"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
