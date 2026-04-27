"use client";

import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { trialDaysLeft } from "@/lib/entitlement";

export function TrialBanner() {
  const { subscription } = useAppState();

  if (subscription.status === "active" || subscription.status === "none") {
    return null;
  }

  if (subscription.status === "expired") {
    return (
      <Link
        href="/you/settings"
        className="pop-in-anim tap-bounce inline-flex items-center gap-1.5 rounded-full border border-clay/40 bg-white/65 px-3 py-1 text-[11px] font-medium text-clay backdrop-blur-xl hover:bg-white/85 transition"
      >
        <AlertCircle size={12} aria-hidden />
        Trial ended
      </Link>
    );
  }

  // trial
  const days = trialDaysLeft(subscription.trialEndsAtIso) ?? 0;
  if (days <= 0) return null;
  return (
    <Link
      href="/you/settings"
      className="pop-in-anim tap-bounce pulse-soft-anim inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/65 px-3 py-1 text-[11px] font-medium text-forest backdrop-blur-xl hover:bg-white/85 transition"
    >
      <Sparkles size={12} aria-hidden />
      {days === 1 ? "1 day left" : `${days} days left`}
    </Link>
  );
}
