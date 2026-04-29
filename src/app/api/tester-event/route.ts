import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

interface EventBody {
  event_type: string;
  payload?: Record<string, unknown>;
  app_version?: string;
}

const ALLOWED_EVENTS = new Set([
  "app_open",
  "onboarding_completed",
  "meal_logged",
  "weight_logged",
  "week_generated",
  "meal_swapped",
  "meal_banned",
  "coach_message_sent",
  "review_submitted",
]);

export async function POST(request: Request) {
  let body: EventBody;
  try {
    body = (await request.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = typeof body.event_type === "string" ? body.event_type : "";
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const appVersion = typeof body.app_version === "string" ? body.app_version.slice(0, 50) : null;
  const payload =
    body.payload && typeof body.payload === "object" ? body.payload : null;

  const { error: insertError } = await admin.from("tester_events").insert({
    user_id: user.id,
    event_type: eventType,
    payload,
    app_version: appVersion,
    user_agent: userAgent,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Keep the testers row fresh — last_seen_at on every event, plus the
  // onboarding timestamp the first time we see "onboarding_completed".
  const updates: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? null,
    last_seen_at: new Date().toISOString(),
    user_agent: userAgent,
    app_version: appVersion,
  };
  if (eventType === "onboarding_completed") {
    updates.onboarding_completed_at = new Date().toISOString();
  }
  await admin.from("testers").upsert(updates, { onConflict: "id" });

  return NextResponse.json({ ok: true });
}
