# Billing Launch Checklist

Billing is wired but disabled by default. The beta/local trial path remains active
until `NEXT_PUBLIC_BILLING_ENABLED=true`.

## RevenueCat setup

1. Create the Pace RevenueCat project.
2. Create the `premium` entitlement, or set
   `NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID` to the entitlement name you choose.
3. Add the Google Play subscription product/base plan/offer in RevenueCat.
4. Configure the current offering, or set
   `NEXT_PUBLIC_REVENUECAT_OFFERING_ID` to a specific offering.
5. Copy the RevenueCat public SDK key into
   `NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY`.

## Supabase setup

1. Apply `supabase/migrations/006_billing_entitlements.sql`.
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in the deployed environment.

## Webhook setup

1. Add this RevenueCat webhook URL:
   `https://pace-nutrition.vercel.app/api/billing/webhook/revenuecat`
2. Set a long random Authorization header in RevenueCat.
3. Set the same exact value in `REVENUECAT_WEBHOOK_AUTHORIZATION`.
4. Send a RevenueCat test webhook and confirm it lands in
   `public.billing_events`.

## Launch switch

Only after the store product and webhook are confirmed:

```env
NEXT_PUBLIC_BILLING_ENABLED=true
```

With billing enabled, the app ignores old local trial state and reads
entitlements from `/api/billing/entitlement`.
