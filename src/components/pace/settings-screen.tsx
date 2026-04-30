"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Sparkles,
  Trash2,
  AlertTriangle,
  Ban,
  Home as HomeIcon,
  Plus,
  X,
} from "lucide-react";
import { BILLING_ENABLED } from "@/lib/billing/config";
import { useAppState } from "@/lib/state/app-state";
import { Button, Card, IconBadge, SectionHeader, Stat } from "./primitives";
import { DEFAULT_PANTRY } from "./foods/shopping";
import { trialDaysLeft } from "@/lib/entitlement";
import { useAppVersion } from "@/lib/app-version";

export function SettingsScreen() {
  const router = useRouter();
  const { auth, profile, targets, subscription, onboardingExtras, notice, actions } =
    useAppState();
  const daysLeft = trialDaysLeft(subscription.trialEndsAtIso);
  const appVersion = useAppVersion();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);

  const skippedIngredients = onboardingExtras.skippedIngredients ?? [];
  const pantryStaples = onboardingExtras.pantryStaples ?? DEFAULT_PANTRY;
  const [skipDraft, setSkipDraft] = useState("");
  const [pantryDraft, setPantryDraft] = useState("");

  async function runSubscriptionAction(action: () => Promise<boolean>) {
    setSubscriptionBusy(true);
    await action();
    setSubscriptionBusy(false);
  }

  function removeSkipped(name: string) {
    const next = skippedIngredients.filter((s) => s !== name);
    actions.setOnboardingExtras({ skippedIngredients: next });
  }

  function addSkipped() {
    const name = skipDraft.trim();
    if (!name) return;
    if (skippedIngredients.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setSkipDraft("");
      return;
    }
    actions.setOnboardingExtras({
      skippedIngredients: [...skippedIngredients, name],
      weekGenerated: false,
      weekSwaps: {},
    });
    setSkipDraft("");
  }

  function removePantry(name: string) {
    const next = pantryStaples.filter((p) => p !== name);
    actions.setOnboardingExtras({ pantryStaples: next });
  }

  function addPantry() {
    const name = pantryDraft.trim();
    if (!name) return;
    if (pantryStaples.some((p) => p.toLowerCase() === name.toLowerCase())) {
      setPantryDraft("");
      return;
    }
    actions.setOnboardingExtras({
      pantryStaples: [...pantryStaples, name],
    });
    setPantryDraft("");
  }

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
      setDeleteError("Deletion cancelled. Confirmation text did not match.");
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
          {BILLING_ENABLED ? (
            <>
              {subscription.status === "active" || subscription.status === "trial" ? (
                <Button
                  variant="secondary"
                  loading={subscriptionBusy}
                  onClick={() => runSubscriptionAction(actions.cancelTrial)}
                >
                  Manage in app store
                </Button>
              ) : (
                <Button
                  loading={subscriptionBusy}
                  onClick={() => runSubscriptionAction(actions.startTrial)}
                >
                  {subscription.status === "expired" ? "Subscribe" : "Start free trial"}
                </Button>
              )}
              <Button
                variant="secondary"
                loading={subscriptionBusy}
                onClick={() => runSubscriptionAction(actions.restoreSubscription)}
              >
                Restore
              </Button>
            </>
          ) : subscription.status === "none" ? (
            <Button
              loading={subscriptionBusy}
              onClick={() => runSubscriptionAction(actions.startTrial)}
            >
              Start free 7-day trial
            </Button>
          ) : subscription.status === "trial" ? (
            <Button
              variant="secondary"
              loading={subscriptionBusy}
              onClick={() => runSubscriptionAction(actions.cancelTrial)}
            >
              Cancel trial
            </Button>
          ) : subscription.status === "expired" ? (
            <Button
              loading={subscriptionBusy}
              onClick={() => runSubscriptionAction(actions.startTrial)}
            >
              Resubscribe
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={subscriptionBusy}
              onClick={() => runSubscriptionAction(actions.cancelTrial)}
            >
              Manage subscription
            </Button>
          )}
        </div>
        {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
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
        <div id="foods-to-skip" />
        <SectionHeader eyebrow="Food safety" title="Allergies & foods to skip" />
        <div className="flex items-start gap-3">
          <IconBadge tone="clay">
            <Ban size={16} aria-hidden />
          </IconBadge>
          <p className="flex-1 text-sm text-muted">
            Ingredients we&rsquo;ll never put in your weekly plan. Add allergies
            like peanuts, sesame, shellfish, or gluten here.
          </p>
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addSkipped();
          }}
        >
          <input
            type="text"
            value={skipDraft}
            onChange={(e) => setSkipDraft(e.target.value)}
            placeholder="Add allergy or food — e.g. Peanuts"
            className="flex-1 rounded-full border border-hairline bg-paper px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <button
            type="submit"
            data-tap
            disabled={!skipDraft.trim()}
            className="tap-bounce inline-flex h-10 items-center gap-1 rounded-full bg-clay px-4 text-sm font-medium text-white disabled:bg-stone-2 disabled:text-faint"
          >
            <Plus size={14} aria-hidden /> Add
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skippedIngredients.length === 0 ? (
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs text-faint">
              Nothing skipped yet.
            </span>
          ) : (
            skippedIngredients.map((s) => (
              <button
                key={s}
                type="button"
                data-tap
                onClick={() => removeSkipped(s)}
                className="tap-bounce inline-flex items-center gap-1.5 rounded-full bg-clay/10 px-3 py-1.5 text-xs font-medium text-clay"
                aria-label={`Remove ${s} from skipped foods`}
              >
                {s}
                <X size={11} aria-hidden />
              </button>
            ))
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Food preferences" title="Already at home" />
        <div className="flex items-start gap-3">
          <IconBadge tone="forest">
            <HomeIcon size={16} aria-hidden />
          </IconBadge>
          <p className="flex-1 text-sm text-muted">
            Pantry staples — kept in recipes, hidden from the shopping list.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pantryStaples.map((p) => (
            <button
              key={p}
              type="button"
              data-tap
              onClick={() => removePantry(p)}
              className="tap-bounce inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest"
              aria-label={`Remove ${p} from pantry`}
            >
              {p}
              <X size={11} aria-hidden />
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addPantry();
          }}
        >
          <input
            type="text"
            value={pantryDraft}
            onChange={(e) => setPantryDraft(e.target.value)}
            placeholder="Add a staple — e.g. Garlic"
            className="flex-1 rounded-full border border-hairline bg-paper px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest"
          />
          <button
            type="submit"
            data-tap
            disabled={!pantryDraft.trim()}
            className="tap-bounce inline-flex h-10 items-center gap-1 rounded-full bg-forest px-4 text-sm font-medium text-white disabled:bg-stone-2 disabled:text-faint"
          >
            <Plus size={14} aria-hidden /> Add
          </button>
        </form>
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
              Permanently delete your account and all associated data: profile, meals, weights, check-ins, photos, and chat history. This cannot be undone.
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
              {deleting ? "Deleting..." : "Delete account"}
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
        Pace · v{appVersion} · Build with care.
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
