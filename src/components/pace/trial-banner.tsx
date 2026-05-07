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
        className="pop-in-anim tap-bounce inline-flex items-center gap-1.5 rounded-full border border-[#ff7a45]/40 bg-[#ff7a45]/[0.10] px-3 py-1 text-[11px] font-semibold text-[#ff9f6e] backdrop-blur-xl hover:bg-[#ff7a45]/[0.16] transition"
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
      className="pop-in-anim tap-bounce pulse-soft-anim inline-flex items-center gap-1.5 rounded-full border border-[#00aef0]/40 bg-[#00aef0]/[0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.10em] text-[#66c8e8] backdrop-blur-xl hover:bg-[#00aef0]/[0.18] transition"
    >
      <Sparkles size={12} aria-hidden />
      {days === 1 ? "1 day left" : `${days} days left`}
    </Link>
  );
}
