"use client";

import { BellRing, Camera, Smartphone, Sun, Sunrise, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/state/app-state";
import {
  DEFAULT_REMINDER_CONFIG,
  clearReminders,
  isNative,
  requestPermission,
  scheduleReminders,
  sendTestNotification,
} from "@/lib/notifications";
import type { PhotoReminderConfig } from "@/lib/state/types";
import { Card, IconBadge, SectionHeader } from "./primitives";

function readConfig(extras: { photoReminders?: PhotoReminderConfig }): PhotoReminderConfig {
  return { ...DEFAULT_REMINDER_CONFIG, ...(extras.photoReminders ?? {}) };
}

export function RemindersScreen() {
  const { reminderState, onboardingExtras, actions } = useAppState();
  const on = reminderState === "on";
  const config = readConfig(onboardingExtras);
  const [permission, setPermission] = useState<"granted" | "denied" | "default" | "unknown">(
    "unknown",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNative()) {
      setPermission("default");
      return;
    }
    if ("Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("denied");
    }
  }, []);

  async function applyConfig(next: PhotoReminderConfig, enable: boolean) {
    actions.setOnboardingExtras({ photoReminders: next });
    if (enable) {
      const ok = await requestPermission();
      if (!ok) {
        actions.setReminderState("off");
        actions.setNotice(
          "Notification permission was not granted. Enable it in your device settings to receive reminders.",
        );
        return;
      }
      setPermission("granted");
      actions.setReminderState("on");
      await scheduleReminders(next);
    } else {
      actions.setReminderState("off");
      await clearReminders();
    }
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await applyConfig(config, !on);
    } finally {
      setBusy(false);
    }
  }

  async function setMode(mode: PhotoReminderConfig["mode"]) {
    if (busy) return;
    const next = { ...config, mode };
    setBusy(true);
    try {
      actions.setOnboardingExtras({ photoReminders: next });
      if (on) await scheduleReminders(next);
    } finally {
      setBusy(false);
    }
  }

  async function setTime(slot: "morning" | "afternoon" | "evening", value: string) {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    const next = { ...config, [slot]: value };
    actions.setOnboardingExtras({ photoReminders: next });
    if (on) {
      setBusy(true);
      try {
        await scheduleReminders(next);
      } finally {
        setBusy(false);
      }
    }
  }

  const showAllMeals = config.mode === "all-meals";

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · REMINDERS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Snap before <span className="text-forest">you eat.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          A gentle nudge at meal time so a quick photo is all the logging you have to do.
        </p>
      </header>

      <Card>
        <div className="flex items-center gap-3">
          <IconBadge tone={on ? "forest" : "stone"}>
            <BellRing size={18} aria-hidden />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg text-ink-2">Meal photo reminders</h2>
            <p className="text-xs text-muted">
              {on
                ? showAllMeals
                  ? "On. Three nudges a day."
                  : "On. One nudge each evening."
                : "Off. Turn on to get a reminder at meal time."}
            </p>
          </div>
          <button
            type="button"
            data-tap
            disabled={busy}
            onClick={toggle}
            aria-pressed={on}
            className={
              "relative h-7 w-12 rounded-full border transition disabled:opacity-60 " +
              (on ? "border-forest bg-forest" : "border-white/70 bg-white/65 backdrop-blur")
            }
          >
            <span
              className={
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition " +
                (on ? "left-[22px]" : "left-0.5")
              }
            />
          </button>
        </div>
      </Card>

      <section>
        <SectionHeader eyebrow="How often" title="Pick your rhythm" />
        <div className="grid grid-cols-2 gap-2">
          <ModeOption
            active={!showAllMeals}
            onClick={() => setMode("evening")}
            icon={<Sunset size={16} aria-hidden />}
            title="Evening only"
            sub="One reminder, before dinner."
          />
          <ModeOption
            active={showAllMeals}
            onClick={() => setMode("all-meals")}
            icon={<Sun size={16} aria-hidden />}
            title="All meals"
            sub="Morning, afternoon, evening."
          />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Times" title="When to ping you" />
        <ul className="space-y-2">
          {showAllMeals && (
            <>
              <TimeRow
                tone="amber"
                icon={<Sunrise size={16} aria-hidden />}
                label="Breakfast photo"
                value={config.morning}
                onChange={(v) => setTime("morning", v)}
              />
              <TimeRow
                tone="sage"
                icon={<Sun size={16} aria-hidden />}
                label="Lunch photo"
                value={config.afternoon}
                onChange={(v) => setTime("afternoon", v)}
              />
            </>
          )}
          <TimeRow
            tone="forest"
            icon={<Sunset size={16} aria-hidden />}
            label="Dinner photo"
            value={config.evening}
            onChange={(v) => setTime("evening", v)}
          />
        </ul>
      </section>

      <Card>
        <div className="flex items-center gap-3">
          <IconBadge tone="sage">
            <Camera size={18} aria-hidden />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-ink-2">Send a test</h3>
            <p className="text-xs text-muted">Make sure notifications come through on this device.</p>
          </div>
          <button
            type="button"
            data-tap
            disabled={!on || busy}
            onClick={() => sendTestNotification()}
            className="rounded-full border border-stone-2 bg-paper px-4 py-2 text-xs font-medium text-ink hover:bg-stone disabled:text-faint"
          >
            Test
          </button>
        </div>
      </Card>

      {!isNative() && (
        <div className="flex gap-3 rounded-2xl border border-stone-2 bg-paper/60 p-4">
          <IconBadge tone="stone">
            <Smartphone size={16} aria-hidden />
          </IconBadge>
          <p className="text-xs leading-relaxed text-muted">
            Reminders work best in the installed Pace app. In a browser they only fire while the
            tab is open. {permission === "denied" && "Notifications are blocked for this site — enable them in your browser settings."}
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        Schedules are saved on this device. We don&apos;t send anything from a server.
      </p>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      data-tap
      onClick={onClick}
      className={
        "rounded-2xl border p-3 text-left transition " +
        (active
          ? "border-forest bg-forest/5"
          : "border-stone-2 bg-paper hover:bg-stone")
      }
    >
      <div className="flex items-center gap-2 text-ink-2">
        <span className={active ? "text-forest" : "text-muted"}>{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </button>
  );
}

function TimeRow({
  tone,
  icon,
  label,
  value,
  onChange,
}: {
  tone: "amber" | "sage" | "forest";
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <li className="card-flat flex items-center gap-4 px-4 py-3">
      <IconBadge tone={tone}>{icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink-2">{label}</div>
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="numerals rounded-lg border border-stone-2 bg-paper px-2 py-1 text-sm text-ink"
      />
    </li>
  );
}
