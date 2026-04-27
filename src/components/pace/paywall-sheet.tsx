"use client";

import { Sparkles, Lock, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useAppState } from "@/lib/state/app-state";
import {
  featureCopy,
  trialDaysLeft,
  useEntitlement,
  type Feature,
} from "@/lib/entitlement";
import { Button, Sheet } from "./primitives";

const premiumPerks = [
  "Unlimited AI photo logging",
  "Tailored nutrition guide",
  "Coach without limits",
  "Full progress history + photo compare",
  "Apple Health, Google Fit & Strava sync",
  "Custom reminder schedules",
];

export function PaywallSheet({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: Feature;
}) {
  const { subscription, actions } = useAppState();
  const copy = featureCopy[feature];
  const isExpired =
    subscription.status === "expired" ||
    (subscription.status === "trial" &&
      (trialDaysLeft(subscription.trialEndsAtIso) ?? 0) === 0);

  function startTrial() {
    actions.startTrial();
    onClose();
  }

  function resubscribe() {
    // Mocked: extend trial 7 days as a test affordance until real billing lands.
    actions.startTrial();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={copy.title}>
      <div className="space-y-5 pb-4">
        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            <Sparkles size={14} aria-hidden /> Premium
          </div>
          <p className="mt-2 text-sm text-ink-2">{copy.body}</p>
        </div>

        <ul className="space-y-2">
          {premiumPerks.map((p) => (
            <li
              key={p}
              className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm text-ink-2 backdrop-blur-xl"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-forest">
                <Check size={14} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          {isExpired ? (
            <Button onClick={resubscribe} size="lg" fullWidth>
              Resubscribe
            </Button>
          ) : subscription.status === "none" ? (
            <Button onClick={startTrial} size="lg" fullWidth>
              Start free 7-day trial
            </Button>
          ) : (
            <Button onClick={onClose} size="lg" fullWidth>
              Keep going
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="block w-full text-center text-xs text-muted hover:text-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function LockedState({
  feature,
  children,
}: {
  feature: Feature;
  children: ReactNode;
}) {
  const verdict = useEntitlement(feature);
  if (verdict.allowed) return <>{children}</>;

  const copy = featureCopy[feature];
  const isExpired = verdict.reason === "trial-expired";

  return <LockedCard title={copy.title} body={copy.body} expired={isExpired} />;
}

function LockedCard({
  title,
  body,
  expired,
}: {
  title: string;
  body: string;
  expired: boolean;
}) {
  const { actions } = useAppState();

  return (
    <div className="stagger-up space-y-5">
      <div className="pop-in-anim rounded-3xl border border-white/70 bg-white/55 p-7 text-center shadow-card backdrop-blur-xl">
        <div className="float-anim mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cream text-forest">
          <Lock size={22} aria-hidden />
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {expired ? "Trial ended" : "Premium feature"}
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink-2">{title}</h2>
        <p className="mx-auto mt-2 max-w-[34ch] text-sm text-muted">{body}</p>
        <Button
          size="lg"
          className="mt-5"
          onClick={() => actions.startTrial()}
        >
          {expired ? "Resubscribe" : "Start free 7-day trial"}
        </Button>
      </div>

      <ul className="space-y-2">
        {premiumPerks.map((p) => (
          <li
            key={p}
            className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm text-ink-2 backdrop-blur-xl"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-forest">
              <Check size={14} aria-hidden />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
