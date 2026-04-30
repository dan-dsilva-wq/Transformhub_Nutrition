"use client";

import { Capacitor } from "@capacitor/core";
import {
  billingConfiguredForClient,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
  REVENUECAT_PUBLIC_API_KEY,
} from "@/lib/billing/config";
import type { Subscription } from "@/lib/state/types";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

let configuredForUserId: string | null = null;

export function billingCanUseNativePurchases() {
  return billingConfiguredForClient() && Capacitor.isNativePlatform();
}

function subscriptionFromCustomerInfo(customerInfo: CustomerInfo): Subscription {
  const entitlement =
    customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ??
    Object.values(customerInfo.entitlements.active)[0];

  if (!entitlement?.isActive) {
    return {
      status: "none",
      provider: "revenuecat",
      providerAppUserId: customerInfo.originalAppUserId,
    };
  }

  return {
    status: entitlement.periodType === "TRIAL" ? "trial" : "active",
    provider: "revenuecat",
    providerAppUserId: customerInfo.originalAppUserId,
    entitlementId: entitlement.identifier,
    productId: entitlement.productIdentifier,
    store: entitlement.store,
    environment: entitlement.isSandbox ? "SANDBOX" : "PRODUCTION",
    trialStartedAtIso:
      entitlement.periodType === "TRIAL" ? entitlement.latestPurchaseDate : undefined,
    trialEndsAtIso:
      entitlement.periodType === "TRIAL" ? entitlement.expirationDate ?? undefined : undefined,
    currentPeriodEndsAtIso: entitlement.expirationDate ?? undefined,
  };
}

function pickPackage(offering: PurchasesOffering): PurchasesPackage | null {
  return (
    offering.monthly ??
    offering.annual ??
    offering.weekly ??
    offering.availablePackages[0] ??
    null
  );
}

async function configureRevenueCat(userId: string, email?: string | null) {
  if (!billingCanUseNativePurchases()) {
    throw new Error("Live billing is not enabled for this build.");
  }

  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  const { isConfigured } = await Purchases.isConfigured().catch(() => ({
    isConfigured: false,
  }));

  if (!isConfigured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey: REVENUECAT_PUBLIC_API_KEY,
      appUserID: userId,
    });
    configuredForUserId = userId;
  } else if (configuredForUserId !== userId) {
    await Purchases.logIn({ appUserID: userId });
    configuredForUserId = userId;
  }

  if (email) {
    await Purchases.setEmail({ email }).catch(() => {});
  }

  return Purchases;
}

export async function purchaseRevenueCatSubscription({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}): Promise<Subscription> {
  const Purchases = await configureRevenueCat(userId, email);
  const offerings = await Purchases.getOfferings();
  const offering = REVENUECAT_OFFERING_ID
    ? offerings.all[REVENUECAT_OFFERING_ID] ?? offerings.current
    : offerings.current;
  const aPackage = offering ? pickPackage(offering) : null;

  if (!aPackage) {
    throw new Error("No RevenueCat subscription package is configured.");
  }

  const result = await Purchases.purchasePackage({ aPackage });
  return subscriptionFromCustomerInfo(result.customerInfo);
}

export async function restoreRevenueCatSubscription({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}): Promise<Subscription> {
  const Purchases = await configureRevenueCat(userId, email);
  const result = await Purchases.restorePurchases();
  return subscriptionFromCustomerInfo(result.customerInfo);
}
