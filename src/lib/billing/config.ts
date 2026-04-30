export const BILLING_ENABLED =
  process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

export const REVENUECAT_PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY ?? "";

export const REVENUECAT_ENTITLEMENT_ID =
  process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || "premium";

export const REVENUECAT_OFFERING_ID =
  process.env.NEXT_PUBLIC_REVENUECAT_OFFERING_ID?.trim() || "";

export function billingConfiguredForClient() {
  return BILLING_ENABLED && Boolean(REVENUECAT_PUBLIC_API_KEY);
}
