"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Wordmark } from "./primitives";
import { WelcomeStep } from "./onboarding/welcome-step";
import { NameStep } from "./onboarding/name-step";
import { BodyStep } from "./onboarding/body-step";
import { GoalStep } from "./onboarding/goal-step";
import { ActivityStep } from "./onboarding/activity-step";
import { RoutineStep } from "./onboarding/routine-step";
import { DietStep } from "./onboarding/diet-step";
import { MotivationStep } from "./onboarding/motivation-step";
import { PlanCalculation } from "./onboarding/plan-calculation";
import { PlanReveal } from "./onboarding/plan-reveal";
import { HabitPillars } from "./onboarding/habit-pillars";
import { TrialOffer } from "./onboarding/trial-offer";

const STORAGE_KEY = "pace.onboarding.step.v1";

const Step = {
  WELCOME: 0,
  NAME: 1,
  BODY: 2,
  GOAL: 3,
  ACTIVITY: 4,
  ROUTINE: 5,
  DIET: 6,
  MOTIVATION: 7,
  CALCULATING: 8,
  REVEAL: 9,
  PILLARS: 10,
  TRIAL: 11,
} as const;

const TOTAL = 12;

export function OnboardingFlow() {
  const { hasOnboarded, actions } = useAppState();
  const router = useRouter();

  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 && n < TOTAL ? n : 0;
  });

  useEffect(() => {
    if (hasOnboarded) router.replace("/today");
  }, [hasOnboarded, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const onNext = () => {
    if (step >= TOTAL - 1) {
      actions.finishOnboarding();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      router.replace("/today");
      return;
    }
    setStep((s) => s + 1);
  };
  const onBack = () => setStep((s) => Math.max(0, s - 1));

  const showBack = step > 0 && step !== Step.CALCULATING;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="px-5 pt-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            data-tap
            aria-label="Back"
            onClick={onBack}
            className={`grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-white/60 hover:text-ink ${
              showBack ? "" : "pointer-events-none opacity-0"
            }`}
          >
            <ArrowLeft size={18} aria-hidden />
          </button>
          <Wordmark size="md" />
          <ProgressDots count={TOTAL} active={step} />
        </div>
      </header>

      <main
        key={step}
        className="slide-up-anim mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-8"
      >
        {step === Step.WELCOME ? (
          <WelcomeStep onNext={onNext} />
        ) : step === Step.NAME ? (
          <NameStep onNext={onNext} />
        ) : step === Step.BODY ? (
          <BodyStep onNext={onNext} />
        ) : step === Step.GOAL ? (
          <GoalStep onNext={onNext} />
        ) : step === Step.ACTIVITY ? (
          <ActivityStep onNext={onNext} />
        ) : step === Step.ROUTINE ? (
          <RoutineStep onNext={onNext} />
        ) : step === Step.DIET ? (
          <DietStep onNext={onNext} />
        ) : step === Step.MOTIVATION ? (
          <MotivationStep onNext={onNext} />
        ) : step === Step.CALCULATING ? (
          <PlanCalculation onNext={onNext} />
        ) : step === Step.REVEAL ? (
          <PlanReveal onNext={onNext} />
        ) : step === Step.PILLARS ? (
          <HabitPillars onNext={onNext} />
        ) : (
          <TrialOffer onNext={onNext} />
        )}
      </main>
    </div>
  );
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i <= active ? "w-3 bg-forest" : "w-1.5 bg-white/70"
          }`}
        />
      ))}
    </div>
  );
}
