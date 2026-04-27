"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../primitives";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mt-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Your plan starts here
        </span>
        <h1 className="mt-3 font-display text-[44px] leading-[1.02] text-ink-2">
          Lose weight at <span className="text-forest">your own pace</span>.
        </h1>
        <p className="mt-4 text-base text-muted">
          A calm, premium plan tailored to your body, your routine, and the life
          you actually live.
        </p>
      </div>

      <ul className="mt-10 space-y-3 text-sm text-ink-2">
        <Bullet color="forest">A daily target built from your numbers.</Bullet>
        <Bullet color="sky">Three habits that move the needle, gently.</Bullet>
        <Bullet color="clay">A coach that holds the line without nagging.</Bullet>
      </ul>

      <div className="mt-auto pt-10">
        <Button onClick={onNext} size="lg" fullWidth>
          Begin <ArrowRight size={18} />
        </Button>
        <p className="mt-3 text-center text-xs text-muted">
          Takes about 90 seconds.
        </p>
      </div>
    </div>
  );
}

function Bullet({
  children,
  color,
}: {
  children: ReactNode;
  color: "forest" | "sky" | "clay";
}) {
  const dot =
    color === "forest" ? "bg-forest" : color === "sky" ? "bg-sky" : "bg-clay";
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{children}</span>
    </li>
  );
}
