"use client";

import { useAppState } from "@/lib/state/app-state";

export type Feature =
  | "ai-photo-unlimited"
  | "coach-unlimited"
  | "nutrition-guide"
  | "progress-history-full"
  | "compare-photos"
  | "integrations-sync"
  | "workouts"
  | "custom-reminders";

export const featureCopy: Record<
  Feature,
  { title: string; body: string }
> = {
  "ai-photo-unlimited": {
    title: "Unlimited photo logging",
    body: "You've used today's 3 free photo estimates. Premium gives you as many as you like.",
  },
  "coach-unlimited": {
    title: "Talk to your coach anytime",
    body: "Free gives you 5 coach messages a week. Premium removes the limit.",
  },
  "nutrition-guide": {
    title: "Your tailored food guide",
    body: "A 7-day plan built around your goals, with shopping lists and easy swaps.",
  },
  "progress-history-full": {
    title: "Full progress history",
    body: "See months and years of your progress, not just the last 30 days.",
  },
  "compare-photos": {
    title: "Side-by-side photo comparison",
    body: "Compare any check-in photo against your starting photo to see how far you've come.",
  },
  "integrations-sync": {
    title: "Smart pantry & calendar",
    body: "Scan groceries to plan meals around what you already have, with reminders that fit around your day.",
  },
  workouts: {
    title: "Your workout plan",
    body: "Five short sessions for a busy week, matched to your equipment at home.",
  },
  "custom-reminders": {
    title: "Custom reminder times",
    body: "Set meal, water, and walk reminders to fit your routine — not the app's.",
  },
};

type Verdict =
  | { allowed: true; via: "free" | "trial" | "active" }
  | {
      allowed: false;
      reason: "locked" | "trial-expired" | "daily-cap" | "weekly-cap";
    };

const FREE_TIER_AI_PHOTO_PER_DAY = 3;
const FREE_TIER_COACH_PER_WEEK = 5;

function isoWeekKey(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    (((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function todayDayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function useEntitlement(feature: Feature): Verdict {
  const { subscription, onboardingExtras } = useAppState();

  if (subscription.status === "active") {
    if (
      subscription.currentPeriodEndsAtIso &&
      (trialDaysLeft(subscription.currentPeriodEndsAtIso) ?? 0) <= 0
    ) {
      return { allowed: false, reason: "trial-expired" };
    }
    return { allowed: true, via: "active" };
  }

  if (subscription.status === "trial") {
    if ((trialDaysLeft(subscription.trialEndsAtIso) ?? 0) <= 0) {
      return { allowed: false, reason: "trial-expired" };
    }
    return { allowed: true, via: "trial" };
  }

  if (subscription.status === "expired") {
    return { allowed: false, reason: "trial-expired" };
  }

  // status === "none"  -  apply free-tier rules per feature.
  if (feature === "ai-photo-unlimited") {
    const usage = onboardingExtras.aiPhotoUsage;
    const today = todayDayKey();
    const count = usage && usage.dayKey === today ? usage.count : 0;
    if (count < FREE_TIER_AI_PHOTO_PER_DAY) {
      return { allowed: true, via: "free" };
    }
    return { allowed: false, reason: "daily-cap" };
  }

  if (feature === "coach-unlimited") {
    const usage = onboardingExtras.coachUsage;
    const week = isoWeekKey();
    const count = usage && usage.weekKey === week ? usage.count : 0;
    if (count < FREE_TIER_COACH_PER_WEEK) {
      return { allowed: true, via: "free" };
    }
    return { allowed: false, reason: "weekly-cap" };
  }

  return { allowed: false, reason: "locked" };
}

export function trialDaysLeft(trialEndsAtIso?: string): number | null {
  if (!trialEndsAtIso) return null;
  const ms = Date.parse(trialEndsAtIso) - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
