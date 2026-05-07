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
    desc: "Active job or 3-5 sessions/wk",
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
          Pick what feels closest to your normal week. You can change this later.
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
                    ? "border-[#00aef0] text-white shadow-[0_8px_24px_-8px_rgba(0,143,208,0.55)]"
                    : "border-white/12 hover:border-white/25",
                )}
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(0,143,208,0.20) 0%, rgba(0,60,83,0.30) 100%)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <span
                  className={clsx(
                    "grid h-10 w-10 place-items-center rounded-full",
                    active
                      ? "bg-[#00aef0] text-white shadow-[0_4px_12px_-2px_rgba(0,143,208,0.55)]"
                      : "bg-white/[0.06] text-white/65 border border-white/12",
                  )}
                >
                  <Icon size={18} aria-hidden />
                </span>
                <div className="flex-1">
                  <div className={clsx("font-semibold", active ? "text-white" : "text-white/85")}>{l.label}</div>
                  <div className={clsx("text-xs mt-0.5", active ? "text-white/75" : "text-white/55")}>{l.desc}</div>
                </div>
                <span
                  className={clsx(
                    "h-5 w-5 rounded-full border-2 transition",
                    active
                      ? "border-[#00aef0] bg-[#00aef0]"
                      : "border-white/25",
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
