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
    title: "Photo logging, unlimited",
    body: "You used today's three free AI photo estimates. Premium unlocks unlimited.",
  },
  "coach-unlimited": {
    title: "Talk to your Coach anytime",
    body: "Free includes 5 messages a week. Premium removes the limit.",
  },
  "nutrition-guide": {
    title: "Tailored nutrition guide",
    body: "Approved-foods curation, swap suggestions, and weekly meal building.",
  },
  "progress-history-full": {
    title: "Full progress history",
    body: "See months and years, not just the last 30 days.",
  },
  "compare-photos": {
    title: "Side-by-side photo compare",
    body: "Compare any week against your starting photo.",
  },
  "integrations-sync": {
    title: "Apple Health, Google Fit & Strava",
    body: "Sync steps, weight, and workouts automatically.",
  },
  workouts: {
    title: "Your workout plan",
    body: "Five short sessions for a busy week, calibrated to your equipment.",
  },
  "custom-reminders": {
    title: "Custom reminder schedules",
    body: "Time meals, water, and walks to your routine, not the app's.",
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
    return { allowed: true, via: "active" };
  }

  if (subscription.status === "trial") {
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
