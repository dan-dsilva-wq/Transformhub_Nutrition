"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Button, Card, IconBadge, SectionHeader, Stat } from "./primitives";
import { trialDaysLeft } from "@/lib/entitlement";

export function SettingsScreen() {
  const router = useRouter();
  const { auth, profile, targets, subscription, actions } = useAppState();
  const daysLeft = trialDaysLeft(subscription.trialEndsAtIso);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function clearLocal() {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Clear all locally stored data on this device? Your account stays signed in.",
    );
    if (!ok) return;
    // Wipe the legacy unscoped key plus every per-user namespaced blob so no
    // cached account data is left behind on this device.
    try {
      window.localStorage.removeItem("pace.state.v1");
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("pace.state.v2:")) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  async function signOut() {
    await actions.signOut();
    router.push("/");
  }

  async function deleteAccount() {
    if (auth.kind !== "signed-in") return;
    const confirmed = window.confirm(
      "Permanently delete your account?\n\nThis erases your profile, meals, weights, check-ins, photos, and chat history. This cannot be undone.",
    );
    if (!confirmed) return;
    const typed = window.prompt(
      "Type DELETE to confirm permanent account deletion.",
    );
    if (typed?.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Deletion cancelled — confirmation text did not match.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const result = await actions.deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    router.push("/");
  }

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · SETTINGS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Tidy <span className="text-forest">up.</span>
        </h1>
      </header>

      <Card>
        <SectionHeader eyebrow="Subscription" title={subscriptionTitle(subscription.status)} />
        <div className="flex items-start gap-3">
          <IconBadge tone={subscription.status === "expired" ? "clay" : "forest"}>
            <Sparkles size={16} aria-hidden />
          </IconBadge>
          <div className="flex-1">
            <p className="text-sm text-ink-2">
              {subscriptionBody(subscription.status, daysLeft)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          {subscription.status === "none" ? (
            <Button onClick={() => actions.startTrial()}>Start free 7-day trial</Button>
          ) : subscription.status === "trial" ? (
            <Button variant="secondary" onClick={() => actions.cancelTrial()}>
              Cancel trial
            </Button>
          ) : subscription.status === "expired" ? (
            <Button onClick={() => actions.startTrial()}>Resubscribe</Button>
          ) : (
            <Button variant="secondary" onClick={() => actions.cancelTrial()}>
              Manage subscription
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Account" title="Signed in" />
        <Stat
          label={auth.kind === "demo" ? "Mode" : "Email"}
          value={
            auth.kind === "signed-in"
              ? auth.email ?? "Member"
              : auth.kind === "demo"
                ? "Demo"
                : "Not signed in"
          }
        />
      </Card>

      <Card>
        <SectionHeader eyebrow="Profile" title="The basics" />
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Age" value={profile.age} />
          <Stat label="Height" value={`${profile.heightCm} cm`} />
          <Stat label="Current" value={`${profile.currentWeightKg} kg`} />
          <Stat label="Goal" value={`${profile.goalWeightKg} kg`} />
          <Stat
            label="Activity"
            value={profile.activityLevel}
            hint={`${profile.workoutsPerWeek} workouts/wk`}
          />
          <Stat label="Daily target" value={`${targets.calories} kcal`} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Change these in <a className="underline-offset-4 hover:underline" href="/you/plan">Plan & targets</a>.
        </p>
      </Card>

      <Card>
        <SectionHeader eyebrow="Data" title="On this device" />
        <p className="text-sm text-muted">
          Pace stores your day on this device first, so it works offline. Sign-in syncs basics across devices.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={clearLocal}>
            <Trash2 size={16} aria-hidden /> Clear local data
          </Button>
        </div>
      </Card>

      {auth.kind === "signed-in" ? (
        <Card>
          <SectionHeader eyebrow="Account" title="Delete account" />
          <div className="flex items-start gap-3">
            <IconBadge tone="clay">
              <AlertTriangle size={16} aria-hidden />
            </IconBadge>
            <p className="text-sm text-ink-2">
              Permanently delete your account and all associated data — profile, meals, weights, check-ins, photos, and chat history. This cannot be undone.
            </p>
          </div>
          {deleteError ? (
            <p className="mt-3 text-sm text-clay" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              onClick={deleteAccount}
              disabled={deleting}
            >
              <Trash2 size={16} aria-hidden />
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-faint">
            Trouble deleting in-app? Visit{" "}
            <a
              className="underline-offset-4 hover:underline"
              href="/account/delete"
            >
              the account deletion page
            </a>{" "}
            or email{" "}
            <a
              className="underline-offset-4 hover:underline"
              href="mailto:vxvo.admin@gmail.com"
            >
              vxvo.admin@gmail.com
            </a>
            .
          </p>
        </Card>
      ) : null}

      <button
        type="button"
        data-tap
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 backdrop-blur-xl px-4 py-3 text-sm font-medium text-muted hover:bg-white/75 hover:text-ink transition"
      >
        <IconBadge tone="stone"><LogOut size={14} aria-hidden /></IconBadge>
        {auth.kind === "demo" ? "Reset demo session" : "Sign out"}
      </button>

      <p className="text-center text-xs text-faint">
        Pace · v1 · Build with care.
      </p>
    </div>
  );
}

function subscriptionTitle(
  status: "none" | "trial" | "active" | "expired",
): string {
  switch (status) {
    case "trial":
      return "Free trial";
    case "active":
      return "Premium";
    case "expired":
      return "Trial ended";
    default:
      return "Free";
  }
}

function subscriptionBody(
  status: "none" | "trial" | "active" | "expired",
  daysLeft: number | null,
): string {
  switch (status) {
    case "trial":
      return daysLeft != null && daysLeft > 0
        ? `${daysLeft === 1 ? "1 day" : `${daysLeft} days`} left of your free trial. Cancel anytime.`
        : "Your trial ends today.";
    case "active":
      return "You're on Premium. Thanks for backing the build.";
    case "expired":
      return "Your trial has ended. Resubscribe to unlock everything again.";
    default:
      return "Free includes the basics. Try Premium for 7 days, no payment today.";
  }
}
