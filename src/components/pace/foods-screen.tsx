"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, History, Sparkles, Utensils, X } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { LockedState } from "./paywall-sheet";
import { allFoodNames } from "./foods/food-data";

export function FoodsScreen() {
  const { targets, onboardingExtras, profile, actions } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;

  const unliked = onboardingExtras.unlikedFoods?.length ?? 0;
  const liked = Math.max(allFoodNames.length - unliked, 0);
  const name = onboardingExtras.name ?? "you";

  const [introOpen, setIntroOpen] = useState(
    !onboardingExtras.hasSeenFoodIntro,
  );

  function dismissIntro() {
    actions.setOnboardingExtras({ hasSeenFoodIntro: true });
    setIntroOpen(false);
  }

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
          <button
            type="button"
            onClick={() => setIntroOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs text-ink shadow-sm backdrop-blur"
          >
            <Sparkles size={13} aria-hidden /> How it works
          </button>
        </div>
      </div>

      {introOpen ? <FoodIntroSheet onClose={dismissIntro} /> : null}
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

interface IntroStep {
  eyebrow: string;
  emoji: string;
  title: string;
  body: string;
  bullets: string[];
  tint: string;
}

const introSteps: IntroStep[] = [
  {
    eyebrow: "Welcome",
    emoji: "🌿",
    title: "Your food guide",
    body: "A short, no-fuss way to eat for your goal. Two parts — pick what you like, then see your week.",
    bullets: [
      "We use your kcal & protein targets from You & targets.",
      "Nothing is rigid. Swap meals or re-roll the week any time.",
    ],
    tint: "from-[rgba(167,243,208,0.55)] to-[rgba(186,230,253,0.55)]",
  },
  {
    eyebrow: "Step 1",
    emoji: "🥗",
    title: "Your foods",
    body: "A master list of real, simple ingredients. Everything starts pre-ticked — just untap anything you don't eat.",
    bullets: [
      "Filter by diet (omnivore, pescatarian, vegetarian, vegan).",
      "Per-meal portions adjust to your meals/day.",
      "Tells you how much protein, carbs and fat to put on the plate.",
    ],
    tint: "from-[rgba(167,243,208,0.7)] to-[rgba(167,243,208,0.4)]",
  },
  {
    eyebrow: "Step 2",
    emoji: "📅",
    title: "Your week",
    body: "A 7-day plan built from the foods you kept. Tap any meal to see the recipe, ingredients and steps.",
    bullets: [
      "Step between last week, this week and next.",
      "&ldquo;Today&rdquo; is highlighted so you know what to cook.",
      "Re-roll the week or export to PDF for the shop.",
    ],
    tint: "from-[rgba(186,230,253,0.7)] to-[rgba(186,230,253,0.4)]",
  },
];

function FoodIntroSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const total = introSteps.length;
  const current = introSteps[step];
  const isLast = step === total - 1;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />
      <div
        className="sheet-anim absolute inset-x-0 bottom-0 mx-auto max-w-md overflow-hidden rounded-t-[28px] border border-white/70 bg-white/85 shadow-elevated backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className={`bg-gradient-to-br ${current.tint} px-5 pt-5 pb-6`}>
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-2">
              {current.eyebrow}
            </span>
            <button
              type="button"
              data-tap
              onClick={onClose}
              aria-label="Skip intro"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-muted hover:text-ink"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-4 text-5xl leading-none">{current.emoji}</div>
          <h2 className="font-display mt-3 text-3xl text-ink-2">{current.title}</h2>
          <p className="mt-2 text-sm text-ink/80">{current.body}</p>
        </div>

        <div className="px-5 py-5">
          <ul className="space-y-2.5">
            {current.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                <span dangerouslySetInnerHTML={{ __html: b }} />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {introSteps.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (i === step ? "w-6 bg-forest" : "w-1.5 bg-ink/15")
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  data-tap
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-full bg-white/70 px-4 py-2 text-sm text-ink-2"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                data-tap
                onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
                className="cta-glow rounded-full bg-forest px-5 py-2 text-sm font-medium text-white shadow-elevated"
              >
                {isLast ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
