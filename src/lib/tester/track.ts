"use client";

type TesterEventType =
  | "app_open"
  | "onboarding_completed"
  | "meal_logged"
  | "weight_logged"
  | "week_generated"
  | "meal_swapped"
  | "meal_banned"
  | "coach_message_sent"
  | "review_submitted";

const sentThisSession = new Set<string>();

export function trackTesterEvent(
  eventType: TesterEventType,
  payload?: Record<string, unknown>,
  options?: { onceForKey?: string },
) {
  if (typeof window === "undefined") return;

  // Optional dedup so heartbeats etc. don't spam the API on every render.
  const dedupKey = options?.onceForKey;
  if (dedupKey) {
    if (sentThisSession.has(dedupKey)) return;
    sentThisSession.add(dedupKey);
  }

  const body = JSON.stringify({
    event_type: eventType,
    payload: payload ?? null,
  });

  // Fire-and-forget. We never block the UI on this and we swallow errors
  // (e.g. user signed out, table missing, network glitch) — the tester
  // shouldn't see a failure for a background analytics ping.
  try {
    fetch("/api/tester-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignored */
  }
}
