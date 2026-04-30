import { NextResponse } from "next/server";
import { BILLING_ENABLED, REVENUECAT_ENTITLEMENT_ID } from "@/lib/billing/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  store?: string;
  environment?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  period_type?: string;
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
  event_timestamp_ms?: number | null;
  cancel_reason?: string | null;
};

type RevenueCatWebhookBody = {
  api_version?: string;
  event?: RevenueCatEvent;
};

function isoFromMs(value?: number | null) {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
}

function uuidOrNull(value?: string | null) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function userIdFromEvent(event: RevenueCatEvent) {
  return (
    uuidOrNull(event.app_user_id) ??
    uuidOrNull(event.original_app_user_id) ??
    event.aliases?.map(uuidOrNull).find(Boolean) ??
    null
  );
}

function eventMatchesEntitlement(event: RevenueCatEvent) {
  const ids = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
  return ids.length === 0 || ids.includes(REVENUECAT_ENTITLEMENT_ID);
}

function statusFromEvent(event: RevenueCatEvent) {
  const type = event.type ?? "UNKNOWN";
  const period = event.period_type ?? "";
  const expirationIso = isoFromMs(event.expiration_at_ms);
  const expiresInFuture = Boolean(expirationIso && Date.parse(expirationIso) > Date.now());

  if (type === "EXPIRATION" || type === "REFUND") return "expired";
  if (type === "BILLING_ISSUE") return "billing_issue";
  if (type === "CANCELLATION") return expiresInFuture ? "active" : "cancelled";
  if (period === "TRIAL" && expiresInFuture) return "trial";
  if (expiresInFuture) return "active";
  return "expired";
}

function willRenewFromEvent(event: RevenueCatEvent) {
  if (event.type === "CANCELLATION" || event.type === "EXPIRATION") return false;
  if (event.type === "BILLING_ISSUE") return false;
  return true;
}

export async function POST(request: Request) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ received: true, billingEnabled: false });
  }

  const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  if (!expectedAuthorization) {
    return NextResponse.json(
      { error: "RevenueCat webhook authorization is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== expectedAuthorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Billing unavailable" }, { status: 503 });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = (await request.json()) as RevenueCatWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "Invalid RevenueCat event" }, { status: 400 });
  }

  const userId = userIdFromEvent(event);
  const eventTimestamp = isoFromMs(event.event_timestamp_ms);

  await admin.from("billing_events").upsert(
    {
      id: event.id,
      provider: "revenuecat",
      user_id: userId,
      event_type: event.type,
      event_timestamp: eventTimestamp,
      payload: body,
    },
    { onConflict: "id" },
  );

  if (userId && eventMatchesEntitlement(event) && event.type !== "TEST") {
    const status = statusFromEvent(event);
    const purchasedAt = isoFromMs(event.purchased_at_ms);
    const expiresAt = isoFromMs(event.expiration_at_ms);
    await admin.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        provider: "revenuecat",
        provider_app_user_id: event.app_user_id ?? event.original_app_user_id ?? userId,
        entitlement_id:
          event.entitlement_ids?.[0] ?? event.entitlement_id ?? REVENUECAT_ENTITLEMENT_ID,
        product_id: event.product_id ?? null,
        store: event.store ?? null,
        environment: event.environment ?? null,
        status,
        will_renew: willRenewFromEvent(event),
        transaction_id: event.transaction_id ?? null,
        original_transaction_id: event.original_transaction_id ?? null,
        purchased_at: purchasedAt,
        trial_started_at: event.period_type === "TRIAL" ? purchasedAt : null,
        trial_ends_at: event.period_type === "TRIAL" ? expiresAt : null,
        current_period_ends_at: expiresAt,
        raw: event,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return NextResponse.json({ received: true });
}
