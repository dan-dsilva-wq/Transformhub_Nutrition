"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import { GenerateHero } from "./foods/generate-hero";
import { GenerateProgress } from "./foods/generate-progress";
import { PlanHub } from "./foods/plan-hub";
import { lessons } from "./foods/lessons";

type Phase = "idle" | "generating";

export function FoodsScreen() {
  const router = useRouter();
  const { onboardingExtras } = useAppState();
  const [phase, setPhase] = useState<Phase>("idle");

  const plan = onboardingExtras.nutritionPlan;

  if (phase === "generating") {
    return (
      <GenerateProgress
        onDone={() => router.push(`/you/foods/learn/${lessons[0].id}`)}
      />
    );
  }

  if (!plan) {
    return <GenerateHero onStart={() => setPhase("generating")} />;
  }

  return <PlanHub onRegenerate={() => setPhase("generating")} />;
}
