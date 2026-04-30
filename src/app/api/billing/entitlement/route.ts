import { NextResponse } from "next/server";
import { BILLING_ENABLED } from "@/lib/billing/config";
import {
  normalizeBillingSubscription,
  type BillingSubscriptionRow,
} from "@/lib/billing/subscription";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!BILLING_ENABLED) {
    return NextResponse.json({
      enabled: false,
      subscription: null,
    });
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json({ error: "Billing unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data, error } = await admin
    .from("billing_subscriptions")
    .select(
      [
        "status",
        "provider",
        "provider_app_user_id",
        "entitlement_id",
        "product_id",
        "store",
        "environment",
        "trial_started_at",
        "trial_ends_at",
        "current_period_ends_at",
      ].join(","),
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load billing" }, { status: 500 });
  }

  return NextResponse.json({
    enabled: true,
    subscription: normalizeBillingSubscription(data as BillingSubscriptionRow | null),
  });
}
