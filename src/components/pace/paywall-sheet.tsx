"use client";

import { Sparkles, Lock, Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BILLING_ENABLED } from "@/lib/billing/config";
import { useAppState } from "@/lib/state/app-state";
import {
  featureCopy,
  trialDaysLeft,
  useEntitlement,
  type Feature,
} from "@/lib/entitlement";
import { Button, Sheet } from "./primitives";

const premiumPerks = [
  "Unlimited photo food logging",
  "Your tailored 7-day food guide",
  "Ask the coach anytime",
  "Full progress history & side-by-side photos",
  "Custom meal & water reminders",
  "Cancel any time, no contract",
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
  const { subscription, notice, actions } = useAppState();
  const [busy, setBusy] = useState(false);
  const copy = featureCopy[feature];
  const isExpired =
    subscription.status === "expired" ||
    (subscription.status === "trial" &&
      (trialDaysLeft(subscription.trialEndsAtIso) ?? 0) === 0);

  async function startTrial() {
    setBusy(true);
    const ok = await actions.startTrial();
    setBusy(false);
    if (ok) onClose();
  }

  async function restore() {
    setBusy(true);
    const ok = await actions.restoreSubscription();
    setBusy(false);
    if (ok) onClose();
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
            <Button onClick={startTrial} size="lg" fullWidth loading={busy}>
              {BILLING_ENABLED ? "Subscribe" : "Resubscribe"}
            </Button>
          ) : subscription.status === "none" ? (
            <Button onClick={startTrial} size="lg" fullWidth loading={busy}>
              {BILLING_ENABLED ? "Start free trial" : "Start free 7-day trial"}
            </Button>
          ) : (
            <Button onClick={onClose} size="lg" fullWidth>
              Keep going
            </Button>
          )}
          {BILLING_ENABLED ? (
            <Button variant="secondary" onClick={restore} fullWidth loading={busy}>
              Restore purchases
            </Button>
          ) : null}
          {notice ? <p className="text-center text-xs text-muted">{notice}</p> : null}
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
  const [busy, setBusy] = useState(false);

  async function startTrial() {
    setBusy(true);
    await actions.startTrial();
    setBusy(false);
  }

  return (
    <div className="stagger-up space-y-5">
      <div className="pop-in-anim surface-deep p-7 text-center" style={{ borderRadius: 28 }}>
        <div
          className="float-anim mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg,#00aef0,#003c53)" }}
        >
          <Lock size={22} aria-hidden />
        </div>
        <p className="font-eyebrow mt-5 text-[#66c8e8]">
          {expired ? "Trial ended" : "Performance Tier"}
        </p>
        <h2 className="mt-1.5 font-display text-2xl text-white">{title}</h2>
        <p className="mx-auto mt-2 max-w-[34ch] text-sm text-white/70">{body}</p>
        <Button
          size="lg"
          className="mt-5 cyan-halo"
          onClick={startTrial}
          loading={busy}
        >
          {expired
            ? BILLING_ENABLED
              ? "Subscribe"
              : "Resubscribe"
            : BILLING_ENABLED
              ? "Start free trial"
              : "Start free 7-day trial"}
        </Button>
      </div>

      <ul className="space-y-2">
        {premiumPerks.map((p) => (
          <li
            key={p}
            className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white/85 backdrop-blur-xl"
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#00aef0,#008fd0)" }}
            >
              <Check size={14} aria-hidden strokeWidth={3} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
