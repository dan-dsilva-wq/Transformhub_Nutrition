"use client";

import { ArrowRight, Sofa, Footprints, Bike, Flame } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { Button } from "../primitives";
import type { ProfileDraft } from "@/lib/state/types";

const levels = [
  { id: "sedentary", label: "Sedentary", desc: "Mostly sitting", icon: Sofa },
  {
    id: "light",
    label: "Light",
    desc: "Some walking, errands",
    icon: Footprints,
  },
  {
    id: "moderate",
    label: "Moderate",
    desc: "Active job or 3–5 sessions/wk",
    icon: Bike,
  },
  {
    id: "active",
    label: "Active",
    desc: "Manual job or daily training",
    icon: Flame,
  },
] as const;

export function ActivityStep({ onNext }: { onNext: () => void }) {
  const { draft, actions } = useAppState();
  const [local, setLocal] = useState<ProfileDraft>(draft);

  function submit() {
    actions.setDraft(local);
    onNext();
  }

  return (
    <div className="flex h-full flex-col">
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Step 4 · Activity
        </span>
        <h2 className="mt-2 font-display text-3xl leading-tight text-ink-2">
          How active is a normal week?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Be honest — under-counting is the usual mistake.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3">
          {levels.map((l) => {
            const active = local.activityLevel === l.id;
            const Icon = l.icon;
            return (
              <button
                key={l.id}
                type="button"
                data-tap
                onClick={() =>
                  setLocal({ ...local, activityLevel: l.id })
                }
                className={clsx(
                  "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition backdrop-blur-xl",
                  active
                    ? "border-forest/40 bg-cream"
                    : "border-white/70 bg-white/45 hover:bg-white/65",
                )}
              >
                <span
                  className={clsx(
                    "grid h-10 w-10 place-items-center rounded-full",
                    active
                      ? "bg-forest text-white"
                      : "bg-white/70 text-muted",
                  )}
                >
                  <Icon size={18} aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="font-medium text-ink-2">{l.label}</div>
                  <div className="text-xs text-muted">{l.desc}</div>
                </div>
                <span
                  className={clsx(
                    "h-5 w-5 rounded-full border-2",
                    active
                      ? "border-forest bg-forest"
                      : "border-stone-2",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-auto pt-8">
        <Button onClick={submit} size="lg" fullWidth>
          Continue <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
