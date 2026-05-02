import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PhotoReminderConfig } from "@/lib/state/types";

/**
 * Meal-photo reminders. On the Capacitor Android/iOS app these are real native
 * scheduled notifications via @capacitor/local-notifications. In a plain
 * browser we fall back to in-tab Notification timers — best-effort, no backend.
 */

const ID_MORNING = 1001;
const ID_AFTERNOON = 1002;
const ID_EVENING = 1003;
const ALL_IDS = [ID_MORNING, ID_AFTERNOON, ID_EVENING];

const COPY = {
  morning: {
    title: "Snap your breakfast",
    body: "Quick photo before you eat — one tap to log it later.",
  },
  afternoon: {
    title: "Lunchtime — take a photo",
    body: "A picture of the plate is all the logging we need for now.",
  },
  evening: {
    title: "Dinner photo?",
    body: "Snap it before you tuck in. Logging takes ten seconds tonight.",
  },
} as const;

function parseHM(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 19,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

function entriesFor(config: PhotoReminderConfig) {
  const evening = {
    id: ID_EVENING,
    ...COPY.evening,
    ...parseHM(config.evening),
  };
  if (config.mode === "evening") return [evening];
  return [
    { id: ID_MORNING, ...COPY.morning, ...parseHM(config.morning) },
    { id: ID_AFTERNOON, ...COPY.afternoon, ...parseHM(config.afternoon) },
    evening,
  ];
}

export function isNative() {
  return Capacitor.isNativePlatform();
}

/** Ask the OS for notification permission. Returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch {
    return false;
  }
}

/** Cancel any previously-scheduled meal-photo reminders. */
export async function clearReminders(): Promise<void> {
  if (isNative()) {
    try {
      await LocalNotifications.cancel({
        notifications: ALL_IDS.map((id) => ({ id })),
      });
    } catch {
      /* ignore */
    }
    return;
  }
  for (const id of ALL_IDS) {
    const t = webTimers.get(id);
    if (t) {
      clearTimeout(t);
      webTimers.delete(id);
    }
  }
}

/**
 * Schedule (or re-schedule) the configured reminders. Idempotent — always
 * cancels prior reminders first. Caller must ensure permission is granted.
 */
export async function scheduleReminders(config: PhotoReminderConfig): Promise<void> {
  await clearReminders();
  const entries = entriesFor(config);

  if (isNative()) {
    await LocalNotifications.schedule({
      notifications: entries.map((e) => ({
        id: e.id,
        title: e.title,
        body: e.body,
        schedule: {
          on: { hour: e.hour, minute: e.minute },
        },
        smallIcon: "ic_launcher",
        extra: { route: "/log" },
      })),
    });
    return;
  }

  // Browser fallback — schedule a one-shot timer per entry for the next firing.
  // Re-arms itself after firing so it keeps repeating daily while the tab lives.
  for (const e of entries) armWebTimer(e);
}

/* ---------- Web fallback ---------- */

const webTimers = new Map<number, ReturnType<typeof setTimeout>>();

function nextFireMs(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function armWebTimer(entry: {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const delay = nextFireMs(entry.hour, entry.minute);
  const t = setTimeout(async () => {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        reg.showNotification(entry.title, {
          body: entry.body,
          icon: "/icon.svg",
          tag: `meal-photo-${entry.id}`,
          data: { route: "/log" },
        });
      } else if (Notification.permission === "granted") {
        new Notification(entry.title, { body: entry.body, icon: "/icon.svg" });
      }
    } catch {
      /* ignore */
    }
    armWebTimer(entry);
  }, delay);
  webTimers.set(entry.id, t);
}

/** Send a one-off test notification right now. */
export async function sendTestNotification(): Promise<void> {
  if (isNative()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title: "Pace reminders are on",
          body: "We'll nudge you at meal times — have a great day.",
          schedule: { at: new Date(Date.now() + 1000) },
          smallIcon: "ic_launcher",
        },
      ],
    });
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.ready;
  if (reg) {
    reg.showNotification("Pace reminders are on", {
      body: "We'll nudge you at meal times — have a great day.",
      icon: "/icon.svg",
    });
  } else {
    new Notification("Pace reminders are on", {
      body: "We'll nudge you at meal times — have a great day.",
      icon: "/icon.svg",
    });
  }
}

export const DEFAULT_REMINDER_CONFIG: PhotoReminderConfig = {
  mode: "evening",
  morning: "08:00",
  afternoon: "13:00",
  evening: "19:30",
};
