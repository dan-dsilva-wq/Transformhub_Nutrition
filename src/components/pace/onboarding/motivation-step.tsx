"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { Button, Textarea } from "../primitives";

export function MotivationStep({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [text, setText] = useState(onboardingExtras.motivation ?? "");

  function submit() {
    const trimmed = text.trim();
    actions.setOnboardingExtras({ motivation: trimmed || undefined });
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 7 · Why now
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          What&apos;s pulling you here?
        </h2>
        <p className="mt-2 text-sm text-muted">
          A sentence is plenty. We&apos;ll surface this in your Coach when motivation dips.
        </p>
        <div className="mt-8">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Optional, but powerful when written down."
            rows={4}
            maxLength={400}
          />
        </div>
      </div>
      <div className="mt-auto flex flex-col items-center gap-3 pt-8">
        <Button onClick={submit} size="lg" fullWidth>
          Continue <ArrowRight size={18} />
        </Button>
        <button
          type="button"
          onClick={submit}
          className="text-xs text-muted hover:text-ink"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
