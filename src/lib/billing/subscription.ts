import type { Subscription } from "@/lib/state/types";

type BillingStatus =
  | "none"
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "billing_issue";

export interface BillingSubscriptionRow {
  status: BillingStatus;
  provider?: string | null;
  provider_app_user_id?: string | null;
  entitlement_id?: string | null;
  product_id?: string | null;
  store?: string | null;
  environment?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
}

function isFuture(iso?: string | null) {
  return Boolean(iso && Date.parse(iso) > Date.now());
}

export function normalizeBillingSubscription(
  row?: BillingSubscriptionRow | null,
): Subscription {
  if (!row) return { status: "none", provider: "revenuecat" };

  const hasActivePeriod = isFuture(row.current_period_ends_at);
  const hasTrialPeriod = isFuture(row.trial_ends_at);
  const status =
    row.status === "active" && hasActivePeriod
      ? "active"
      : row.status === "trial" && hasTrialPeriod
        ? "trial"
        : row.status === "billing_issue" && hasActivePeriod
          ? "active"
          : row.status === "none"
            ? "none"
            : "expired";

  return {
    status,
    provider: row.provider ?? "revenuecat",
    providerAppUserId: row.provider_app_user_id ?? undefined,
    entitlementId: row.entitlement_id ?? undefined,
    productId: row.product_id ?? undefined,
    store: row.store ?? undefined,
    environment: row.environment ?? undefined,
    trialStartedAtIso: row.trial_started_at ?? undefined,
    trialEndsAtIso: row.trial_ends_at ?? undefined,
    currentPeriodEndsAtIso: row.current_period_ends_at ?? undefined,
  };
}

export function subscriptionIsPaidOrTrial(subscription: Subscription) {
  return subscription.status === "active" || subscription.status === "trial";
}
