"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { Button, Input } from "../primitives";

export function NameStep({ onNext }: { onNext: () => void }) {
  const { onboardingExtras, actions } = useAppState();
  const [name, setName] = useState(onboardingExtras.name ?? "");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    actions.setOnboardingExtras({ name: trimmed });
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 1
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          What should we call you?
        </h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll use your first name throughout your plan.
        </p>
        <div className="mt-8">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="First name"
            autoFocus
            autoComplete="given-name"
          />
        </div>
      </div>
      <div className="mt-auto pt-8">
        <Button onClick={submit} size="lg" fullWidth disabled={!name.trim()}>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
