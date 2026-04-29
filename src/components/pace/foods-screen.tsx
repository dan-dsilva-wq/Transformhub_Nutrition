"use client";

import Link from "next/link";
import { ChevronRight, History, Utensils } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { LockedState } from "./paywall-sheet";
import { allFoodNames } from "./foods/food-data";

export function FoodsScreen() {
  const { targets, onboardingExtras, profile } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;

  const unliked = onboardingExtras.unlikedFoods?.length ?? 0;
  const liked = Math.max(allFoodNames.length - unliked, 0);
  const name = onboardingExtras.name ?? "you";

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-5">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            YOU · FOOD
          </p>
          <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
            Your <span className="text-forest">food, your way.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Pick what you eat. We&rsquo;ll plan the week from it.
          </p>
        </header>

        <div className="rounded-3xl border border-white/70 bg-white/55 px-4 py-3 text-sm shadow-card backdrop-blur-xl">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-lg text-ink-2">
              {Math.round(targets.calories)} kcal
            </span>
            <span className="text-muted">·</span>
            <span className="text-ink">{Math.round(targets.proteinG)}g protein</span>
            <span className="text-muted">·</span>
            <span className="text-ink">{mealsPerDay} meals/day</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Tuned for {name} · {profile.currentWeightKg}→{profile.goalWeightKg} kg
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <HubTile
            href="/you/foods/list"
            emoji="🥗"
            title="Your foods"
            sub={`${liked} liked`}
            tint="bg-[rgba(167,243,208,0.35)]"
          />
          <HubTile
            href="/you/foods/week"
            emoji="📅"
            title="Your week"
            sub="7-day plan"
            tint="bg-[rgba(186,230,253,0.35)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/you/foods/list"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs text-ink shadow-sm backdrop-blur"
          >
            <Utensils size={13} aria-hidden /> {mealsPerDay} meals/day
          </Link>
          <Link
            href="/you/foods/week"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs text-ink shadow-sm backdrop-blur"
          >
            <History size={13} aria-hidden /> History &amp; ahead
          </Link>
        </div>
      </div>
    </LockedState>
  );
}

function HubTile({
  href,
  emoji,
  title,
  sub,
  tint,
}: {
  href: string;
  emoji: string;
  title: string;
  sub: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      data-tap
      className={`tap-bounce relative flex aspect-square flex-col justify-between rounded-3xl border border-white/70 ${tint} p-4 text-left shadow-card backdrop-blur-xl`}
    >
      <span className="text-5xl leading-none">{emoji}</span>
      <div>
        <div className="font-display text-xl text-ink-2">{title}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          <span>{sub}</span>
          <ChevronRight size={13} aria-hidden />
        </div>
      </div>
    </Link>
  );
}
