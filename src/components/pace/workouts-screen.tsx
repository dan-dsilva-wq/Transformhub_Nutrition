"use client";

import { Dumbbell } from "lucide-react";

export function WorkoutsScreen() {
  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · WORKOUTS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Move <span className="text-forest">a little.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Five short sessions, designed for a busy week.
        </p>
      </header>

      <div className="rounded-3xl border border-white/70 bg-white/55 px-6 py-12 text-center shadow-card backdrop-blur-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest/10 text-forest">
          <Dumbbell size={26} aria-hidden />
        </div>
        <h2 className="font-display mt-4 text-2xl text-ink-2">Coming soon</h2>
        <p className="mt-2 text-sm text-muted">
          We&rsquo;re building a workout plan that fits around your week. For now,
          walking counts &mdash; track your steps on Today.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-forest">
          In progress
        </span>
      </div>
    </div>
  );
}
