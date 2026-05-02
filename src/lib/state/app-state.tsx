"use client";

/* eslint-disable react-hooks/set-state-in-effect -- hydrating from
   localStorage on mount is a one-time external-system subscription. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { BILLING_ENABLED } from "@/lib/billing/config";
import {
  purchaseRevenueCatSubscription,
  restoreRevenueCatSubscription,
} from "@/lib/billing/revenuecat-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  demoMeals,
  demoProfile,
  demoTargets,
  demoWorkoutPlan,
} from "@/lib/demo-data";
import { defaultApprovedFoods } from "@/lib/nutrition";
import {
  calculateDailyTargets,
  createBusyHomeWorkoutPlan,
  resolveGoalIntent,
  resolveWeeklyRateKg,
  suggestedGoalWeightKg,
  type TargetProfile,
} from "@/lib/targets";
import type { CoachResponse, MealEstimate } from "@/lib/ai/schemas";
import { createStorageObjectId } from "@/lib/storage-id";
import { trackTesterEvent } from "@/lib/tester/track";
import type {
  AppActions,
  AppContextValue,
  AuthStatus,
  ChatMessage,
  CheckIn,
  MealLog,
  NutritionPlan,
  OnboardingExtras,
  ProfileDraft,
  Subscription,
  WeightEntry,
} from "./types";

/**
 * Legacy unscoped key. Pre-fix builds wrote everything here, which leaked one
 * account's cached profile/meals into the next account that signed in on the
 * same device. We migrate it into the first signed-in user's namespace and
 * then delete it.
 */
const LEGACY_STATE_KEY = "pace.state.v1";
const STATE_KEY_PREFIX = "pace.state.v2:";
const GUEST_SCOPE = "guest";
const DEMO_SCOPE = "demo";

function scopedKey(scope: string) {
  return `${STATE_KEY_PREFIX}${scope}`;
}

const greetMessage =
  "I keep this practical. Show me the messy bits of the day and I'll help you make the next good move.";

const defaultChat: ChatMessage[] = [
  {
    role: "assistant",
    content: greetMessage,
    actions: ["Log the next meal", "Hit water target", "Take a 10 min walk"],
  },
];

function profileToDraft(profile: TargetProfile): ProfileDraft {
  const goalIntent = resolveGoalIntent(profile);
  return {
    age: String(profile.age),
    sexForCalories: profile.sexForCalories,
    units: "metric",
    heightCm: String(profile.heightCm),
    currentWeightKg: String(profile.currentWeightKg),
    goalWeightKg: String(profile.goalWeightKg),
    goalIntent,
    weeklyRateKg: String(resolveWeeklyRateKg(profile, goalIntent)),
    activityLevel: profile.activityLevel,
    baselineSteps: String(profile.baselineSteps ?? 5600),
    workoutsPerWeek: String(profile.workoutsPerWeek ?? 3),
    equipment: "bands",
    accountabilityStyle: "firm",
    approvedFoods: defaultApprovedFoods,
  };
}

function numOr(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normaliseDraft(draft: Partial<ProfileDraft>, fallbackProfile: TargetProfile): ProfileDraft {
  const currentWeightKg = String(draft.currentWeightKg ?? fallbackProfile.currentWeightKg);
  const current = numOr(currentWeightKg, fallbackProfile.currentWeightKg);
  const rawGoal = draft.goalWeightKg ?? String(fallbackProfile.goalWeightKg);
  const goal = numOr(rawGoal, fallbackProfile.goalWeightKg);
  const goalIntent = draft.goalIntent ?? resolveGoalIntent({
    goalIntent: fallbackProfile.goalIntent,
    currentWeightKg: current,
    goalWeightKg: goal,
  });

  return {
    ...profileToDraft({
      ...fallbackProfile,
      currentWeightKg: current,
      goalWeightKg: goal,
      goalIntent,
      weeklyRateKg: fallbackProfile.weeklyRateKg,
    }),
    ...draft,
    currentWeightKg,
    goalWeightKg: rawGoal,
    goalIntent,
    weeklyRateKg: String(draft.weeklyRateKg ?? resolveWeeklyRateKg(fallbackProfile, goalIntent)),
  };
}

function draftToProfile(draft: ProfileDraft): TargetProfile {
  const currentWeightKg = numOr(draft.currentWeightKg, 80);
  const goalIntent = draft.goalIntent ?? "lose";
  return {
    age: numOr(draft.age, 30),
    sexForCalories: draft.sexForCalories,
    heightCm: numOr(draft.heightCm, 170),
    currentWeightKg,
    goalWeightKg: numOr(
      draft.goalWeightKg,
      suggestedGoalWeightKg(currentWeightKg, goalIntent),
    ),
    goalIntent,
    weeklyRateKg: numOr(draft.weeklyRateKg, resolveWeeklyRateKg({}, goalIntent)),
    activityLevel: draft.activityLevel,
    baselineSteps: numOr(draft.baselineSteps, 5000),
    workoutsPerWeek: numOr(draft.workoutsPerWeek, 3),
  };
}

function normaliseProfile(profile: TargetProfile): TargetProfile {
  const goalIntent = resolveGoalIntent(profile);
  return {
    ...profile,
    goalIntent,
    weeklyRateKg: resolveWeeklyRateKg(profile, goalIntent),
  };
}

function sameTargetProfile(a: TargetProfile, b: TargetProfile) {
  return (
    a.age === b.age &&
    a.sexForCalories === b.sexForCalories &&
    a.heightCm === b.heightCm &&
    a.currentWeightKg === b.currentWeightKg &&
    a.goalWeightKg === b.goalWeightKg &&
    resolveGoalIntent(a) === resolveGoalIntent(b) &&
    resolveWeeklyRateKg(a, resolveGoalIntent(a)) === resolveWeeklyRateKg(b, resolveGoalIntent(b)) &&
    a.activityLevel === b.activityLevel &&
    (a.baselineSteps ?? 5000) === (b.baselineSteps ?? 5000) &&
    (a.workoutsPerWeek ?? 3) === (b.workoutsPerWeek ?? 3)
  );
}

function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function weightEntryForToday(weightKg: number): WeightEntry {
  return {
    date: todayLabel(),
    isoDate: todayIsoDate(),
    weightKg: Math.round(weightKg * 10) / 10,
  };
}

const demoWeightSignatures = new Set([
  "Apr 1|82.4",
  "Apr 8|81.8",
  "Apr 15|81.1",
  "Apr 22|80.7",
]);

function withoutSeedWeights(weights: WeightEntry[]) {
  return weights.filter(
    (entry) => !demoWeightSignatures.has(`${entry.date}|${entry.weightKg}`),
  );
}

const AppContext = createContext<AppContextValue | null>(null);

interface PersistedShape {
  profile?: TargetProfile;
  draft?: ProfileDraft;
  meals?: MealLog[];
  waterMl?: number;
  steps?: number;
  weights?: WeightEntry[];
  checkIns?: CheckIn[];
  chat?: ChatMessage[];
  approvedFoods?: string[];
  hasOnboarded?: boolean;
  reminderState?: "off" | "on";
  subscription?: Subscription;
  onboardingExtras?: OnboardingExtras;
  /** date string of the currently-loaded "day"  -  used to reset water/steps daily */
  dayKey?: string;
}

function loadPersisted(scope: string): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(scopedKey(scope));
    return raw ? (JSON.parse(raw) as PersistedShape) : null;
  } catch {
    return null;
  }
}

function persist(scope: string, state: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedKey(scope), JSON.stringify(state));
  } catch {
    /* quota or private mode  -  ignore */
  }
}

function clearPersisted(scope: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(scopedKey(scope));
  } catch {
    /* ignore */
  }
}

function clearLegacy() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STATE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * One-shot migration: if a legacy unscoped blob exists and the target user
 * has no namespaced blob yet, adopt the legacy blob into their namespace.
 * Always deletes the legacy key afterwards so subsequent sign-ins can't
 * inherit it.
 */
function migrateLegacyInto(scope: string) {
  if (typeof window === "undefined") return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_STATE_KEY);
    if (!legacy) return;
    const existing = window.localStorage.getItem(scopedKey(scope));
    if (!existing) {
      window.localStorage.setItem(scopedKey(scope), legacy);
    }
    window.localStorage.removeItem(LEGACY_STATE_KEY);
  } catch {
    /* ignore */
  }
}

function todayDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isSameDay(meal: MealLog, dayKey: string) {
  return meal.loggedAt.slice(0, 10) === dayKey;
}

function isoWeekKey(date = new Date()) {
  // ISO week-year + week number (e.g. "2026-W17"). Anchors weekly Coach usage.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const defaultSubscription: Subscription = {
  status: "none",
  provider: BILLING_ENABLED ? "revenuecat" : "local",
};

const defaultOnboardingExtras: OnboardingExtras = {
  dietaryPreferences: [],
  commitments: { steps: false, water: false, nutrition: false },
  hasSeenTour: false,
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [auth, setAuth] = useState<AuthStatus>(() =>
    supabase ? { kind: "signed-out" } : { kind: "demo" },
  );

  // Storage scope: which localStorage namespace to read/write from. Null while
  // we're still waiting for Supabase to tell us who's signed in. In demo mode
  // (no Supabase) we know the scope up front.
  const [storageScope, setStorageScope] = useState<string | null>(
    supabase ? null : DEMO_SCOPE,
  );
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  const [isHydrating, setIsHydrating] = useState<boolean>(Boolean(supabase));
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);

  const [profile, setProfile] = useState<TargetProfile>(demoProfile);
  const [draft, setDraft] = useState<ProfileDraft>(profileToDraft(demoProfile));
  const [targets, setTargets] = useState(demoTargets);
  const [workoutPlan, setWorkoutPlan] = useState(demoWorkoutPlan);

  const [meals, setMeals] = useState<MealLog[]>(() =>
    supabase
      ? []
      : demoMeals.map((meal, index) => ({
          id: `demo-${index}`,
          name: meal.name,
          loggedAt: new Date().toISOString().slice(0, 10) + `T${meal.time}:00`,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          fiberG: meal.fiberG,
        })),
  );

  const [waterMl, setWaterMl] = useState<number>(supabase ? 0 : 1450);
  const [steps, setStepsState] = useState<number>(supabase ? 0 : 6200);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>(defaultChat);

  const [approvedFoods, setApprovedFoodsState] =
    useState<string[]>(defaultApprovedFoods);
  const [reminderState, setReminderStateState] = useState<"off" | "on">("off");
  const [subscription, setSubscriptionState] =
    useState<Subscription>(defaultSubscription);
  const [onboardingExtras, setOnboardingExtrasState] =
    useState<OnboardingExtras>(defaultOnboardingExtras);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastCoachResponse, setLastCoachResponse] = useState<CoachResponse | null>(null);

  const dayKeyRef = useRef<string>(todayDayKey());

  const refreshSubscription = useCallback<AppActions["refreshSubscription"]>(async () => {
    if (!BILLING_ENABLED) return;
    try {
      const res = await fetch("/api/billing/entitlement", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        enabled?: boolean;
        subscription?: Subscription | null;
      };
      if (json.enabled && json.subscription) {
        setSubscriptionState(json.subscription);
      } else if (json.enabled) {
        setSubscriptionState(defaultSubscription);
      }
    } catch {
      /* entitlement refresh is best-effort; RevenueCat/webhook remains authoritative */
    }
  }, []);

  // Hydrate from localStorage whenever the storage scope resolves or changes
  // (e.g. user signs in / signs out / switches accounts). We reset every
  // piece of state to its default first so a previous user's cached data
  // can't leak into the next account.
  useEffect(() => {
    if (!storageScope) return;

    setHasHydrated(false);

    // Reset to defaults before reading from this scope's blob.
    setProfile(demoProfile);
    setDraft(profileToDraft(demoProfile));
    setTargets(demoTargets);
    setWorkoutPlan(demoWorkoutPlan);
    const isDemo = storageScope === DEMO_SCOPE;
    setMeals(
      isDemo
        ? demoMeals.map((meal, index) => ({
            id: `demo-${index}`,
            name: meal.name,
            loggedAt: new Date().toISOString().slice(0, 10) + `T${meal.time}:00`,
            calories: meal.calories,
            proteinG: meal.proteinG,
            carbsG: meal.carbsG,
            fatG: meal.fatG,
            fiberG: meal.fiberG,
          }))
        : [],
    );
    setWaterMl(isDemo ? 1450 : 0);
    setStepsState(isDemo ? 6200 : 0);
    setWeights([]);
    setCheckIns([]);
    setChat(defaultChat);
    setApprovedFoodsState(defaultApprovedFoods);
    setReminderStateState("off");
    setHasOnboarded(false);
    setSubscriptionState(defaultSubscription);
    setOnboardingExtrasState(defaultOnboardingExtras);

    if (storageScope === GUEST_SCOPE || storageScope === DEMO_SCOPE) {
      // Don't let unscoped legacy data leak into a signed-out / demo session.
      clearLegacy();
    } else {
      // Real user  -  adopt any pre-fix legacy blob into their namespace once.
      migrateLegacyInto(storageScope);
    }

    const persisted = loadPersisted(storageScope);
    if (!persisted) {
      setHasHydrated(true);
      return;
    }

    const today = todayDayKey();
    const wasToday = persisted.dayKey === today;

    const hydratedProfile = persisted.profile
      ? normaliseProfile(persisted.profile)
      : demoProfile;

    if (persisted.profile) {
      setProfile(hydratedProfile);
      try {
        setTargets(calculateDailyTargets(hydratedProfile));
      } catch {
        /* invalid persisted profile; ignore */
      }
    }
    if (persisted.draft) {
      setDraft(normaliseDraft(persisted.draft, hydratedProfile));
    } else if (persisted.profile) {
      setDraft(profileToDraft(hydratedProfile));
    }
    if (persisted.meals) setMeals(persisted.meals);
    if (persisted.weights) setWeights(withoutSeedWeights(persisted.weights));
    if (persisted.checkIns) setCheckIns(persisted.checkIns);
    if (persisted.chat?.length) setChat(persisted.chat);
    if (persisted.approvedFoods) setApprovedFoodsState(persisted.approvedFoods);
    if (persisted.reminderState) setReminderStateState(persisted.reminderState);
    if (persisted.hasOnboarded) setHasOnboarded(true);
    if (persisted.subscription && !BILLING_ENABLED) {
      const sub = persisted.subscription;
      const isExpired =
        sub.status === "trial" &&
        sub.trialEndsAtIso &&
        Date.now() > Date.parse(sub.trialEndsAtIso);
      setSubscriptionState(isExpired ? { ...sub, status: "expired" } : sub);
    } else if (BILLING_ENABLED) {
      setSubscriptionState(defaultSubscription);
    }
    if (persisted.onboardingExtras) {
      setOnboardingExtrasState({
        ...defaultOnboardingExtras,
        ...persisted.onboardingExtras,
      });
    }

    if (wasToday) {
      if (typeof persisted.waterMl === "number") setWaterMl(persisted.waterMl);
      if (typeof persisted.steps === "number") setStepsState(persisted.steps);
    } else {
      // new day  -  reset daily counters
      setWaterMl(0);
      setStepsState(0);
    }

    dayKeyRef.current = today;
    setHasHydrated(true);
  }, [storageScope]);

  // Persist on changes  -  only after hydration into the current scope is
  // complete, so we never overwrite a user's blob with reset defaults.
  useEffect(() => {
    if (!storageScope || !hasHydrated) return;
    persist(storageScope, {
      profile,
      draft,
      meals,
      waterMl,
      steps,
      weights,
      checkIns,
      chat,
      approvedFoods,
      reminderState,
      hasOnboarded,
      subscription,
      onboardingExtras,
      dayKey: dayKeyRef.current,
    });
  }, [
    storageScope,
    hasHydrated,
    profile,
    draft,
    meals,
    waterMl,
    steps,
    weights,
    checkIns,
    chat,
    approvedFoods,
    reminderState,
    hasOnboarded,
    subscription,
    onboardingExtras,
  ]);

  useEffect(() => {
    if (auth.kind !== "signed-in" || !hasHydrated) return;

    const timer = window.setTimeout(() => {
      void fetch("/api/state/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          targets,
          meals: meals.slice(0, 500).map((meal) => ({
            ...meal,
            imageUrl: meal.imageUrl?.startsWith("data:") ? undefined : meal.imageUrl,
          })),
          weights: weights.slice(0, 500),
          checkIns: checkIns.slice(0, 500),
          hasOnboarded,
          onboardingExtras: { name: onboardingExtras.name },
        }),
        keepalive: true,
      }).catch(() => {
        /* best-effort sync; localStorage remains the offline cache */
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    auth.kind,
    hasHydrated,
    profile,
    targets,
    meals,
    weights,
    checkIns,
    hasOnboarded,
    onboardingExtras.name,
  ]);

  useEffect(() => {
    if (!BILLING_ENABLED || auth.kind !== "signed-in" || !hasHydrated) return;
    void refreshSubscription();
  }, [auth.kind, hasHydrated, refreshSubscription]);

  // Re-arm meal-photo reminders after hydration so a fresh app launch
  // (or the browser fallback's setTimeout being lost on tab close) keeps
  // the user's chosen schedule alive. Idempotent.
  useEffect(() => {
    if (!hasHydrated) return;
    if (reminderState !== "on") return;
    void (async () => {
      const { scheduleReminders, DEFAULT_REMINDER_CONFIG } = await import(
        "@/lib/notifications"
      );
      await scheduleReminders({
        ...DEFAULT_REMINDER_CONFIG,
        ...(onboardingExtras.photoReminders ?? {}),
      });
    })();
  }, [hasHydrated, reminderState, onboardingExtras.photoReminders]);

  // Reload the WebView when the app returns to foreground after a long
  // background, so testers always see the latest Vercel deploy without
  // having to manually clear cache. Skipped if backgrounded < 60s.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let hiddenAt: number | null = null;
    let listener: { remove: () => void } | null = null;
    void CapacitorApp.addListener("appStateChange", (state) => {
      if (!state.isActive) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > 60_000) {
        window.location.reload();
      }
      hiddenAt = null;
    }).then((handle) => {
      listener = handle;
    });
    return () => {
      listener?.remove();
    };
  }, []);

  // Native deep-link → exchange OAuth code for a session in-app.
  useEffect(() => {
    if (!supabase) return;
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => void } | null = null;
    void CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        if (!url.startsWith("com.danieldsilva.pace://")) return;
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        /* ignore  -  bad URL */
      }
    }).then((handle) => {
      listener = handle;
    });
    return () => {
      listener?.remove();
    };
  }, [supabase]);

  // Auth wiring (light  -  full sync logic intentionally simplified for this rebuild).
  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const hydrationTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setAuth((current) =>
        current.kind === "signed-in" ? current : { kind: "signed-out" },
      );
      setStorageScope((prev) => prev ?? GUEST_SCOPE);
      setIsHydrating(false);
    }, 5000);

    const applyUser = (u: { id: string; email: string | null } | null) => {
      if (u) {
        setAuth({ kind: "signed-in", userId: u.id, email: u.email });
        setStorageScope((prev) => (prev === u.id ? prev : u.id));
      } else {
        setAuth({ kind: "signed-out" });
        setStorageScope((prev) => (prev === GUEST_SCOPE ? prev : GUEST_SCOPE));
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      window.clearTimeout(hydrationTimeout);
      const u = data.user;
      applyUser(u ? { id: u.id, email: u.email ?? null } : null);
      setIsHydrating(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user;
      applyUser(u ? { id: u.id, email: u.email ?? null } : null);
      setIsHydrating(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(hydrationTimeout);
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const commitDraft = useCallback(() => {
    const next = draftToProfile(draft);
    const changed = !sameTargetProfile(profile, next);
    setProfile(next);
    try {
      setTargets(calculateDailyTargets(next));
    } catch {
      /* guardrail tripped  -  keep prior targets */
    }
    setWorkoutPlan(createBusyHomeWorkoutPlan(draft.equipment));
    if (changed) {
      setOnboardingExtrasState((prev) => ({
        ...prev,
        nutritionPlan: undefined,
        weekGenerated: false,
        weekSwaps: {},
      }));
    }
  }, [draft, profile]);

  const finishOnboarding = useCallback(() => {
    const next = draftToProfile(draft);
    setProfile(next);
    try {
      setTargets(calculateDailyTargets(next));
    } catch {
      /* guardrail  -  still mark onboarded so user can edit later */
    }
    setWorkoutPlan(createBusyHomeWorkoutPlan(draft.equipment));
    setWeights((prev) => {
      if (prev.length > 0) return prev;
      return [weightEntryForToday(next.currentWeightKg)];
    });
    setHasOnboarded(true);
    trackTesterEvent("onboarding_completed", {
      currentWeightKg: next.currentWeightKg,
      goalWeightKg: next.goalWeightKg,
      goalIntent: next.goalIntent,
      weeklyRateKg: next.weeklyRateKg,
      activityLevel: next.activityLevel,
    });
  }, [draft]);

  const addMeal = useCallback<AppActions["addMeal"]>((meal) => {
    const { source = "manual", loggedAt: requestedLoggedAt, ...mealData } = meal;
    const id = createStorageObjectId();
    const loggedAt = requestedLoggedAt ?? new Date().toISOString();
    const next: MealLog = { id, loggedAt, ...mealData };
    setMeals((prev) => [next, ...prev]);
    trackTesterEvent("meal_logged", {
      name: next.name,
      calories: next.calories,
      proteinG: next.proteinG,
      source,
    });
    return next;
  }, []);

  const addMealFromEstimate = useCallback<AppActions["addMealFromEstimate"]>(
    (estimate: MealEstimate, opts) => {
      const next: MealLog = {
        id: createStorageObjectId(),
        name: estimate.summary,
        loggedAt: new Date().toISOString(),
        calories: Math.round(estimate.totals.calories),
        proteinG: Math.round(estimate.totals.proteinG),
        carbsG: Math.round(estimate.totals.carbsG),
        fatG: Math.round(estimate.totals.fatG),
        fiberG: Math.round(estimate.totals.fiberG),
        confidence: estimate.confidence,
        imageUrl: opts?.imageUrl,
      };
      setMeals((prev) => [next, ...prev]);
      trackTesterEvent("meal_logged", {
        name: next.name,
        calories: next.calories,
        proteinG: next.proteinG,
        source: "ai-photo",
      });
      return next;
    },
    [],
  );

  const updateMeal = useCallback<AppActions["updateMeal"]>((id, patch) => {
    setMeals((prev) =>
      prev.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal)),
    );
  }, []);

  const removeMeal = useCallback<AppActions["removeMeal"]>((id) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addWater = useCallback<AppActions["addWater"]>((ml) => {
    setWaterMl((prev) => Math.max(0, prev + ml));
  }, []);

  const setWater = useCallback<AppActions["setWater"]>((ml) => {
    setWaterMl(Math.max(0, ml));
  }, []);

  const setSteps = useCallback<AppActions["setSteps"]>((s) => {
    setStepsState(Math.max(0, s));
  }, []);

  const addWeight = useCallback<AppActions["addWeight"]>((weightKg) => {
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    const entry = weightEntryForToday(weightKg);
    trackTesterEvent("weight_logged", { weightKg: entry.weightKg });
    const nextProfile = { ...profile, currentWeightKg: entry.weightKg };
    setWeights((prev) => [...prev, entry]);
    setProfile(nextProfile);
    try {
      setTargets(calculateDailyTargets(nextProfile));
    } catch {
      /* keep prior targets if the saved profile trips guardrails */
    }
    setDraft((prev) => ({ ...prev, currentWeightKg: String(entry.weightKg) }));
    setOnboardingExtrasState((prev) => ({
      ...prev,
      nutritionPlan: undefined,
      weekGenerated: false,
      weekSwaps: {},
    }));
  }, [profile]);

  const addCheckIn = useCallback<AppActions["addCheckIn"]>((checkIn) => {
    const next: CheckIn = {
      id: createStorageObjectId(),
      date: checkIn.date ?? todayLabel(),
      isoDate: todayIsoDate(),
      note: checkIn.note,
      photoUrl: checkIn.photoUrl ?? null,
      energy: checkIn.energy,
      hunger: checkIn.hunger,
    };
    setCheckIns((prev) => [next, ...prev]);
  }, []);

  const appendChat = useCallback<AppActions["appendChat"]>((message) => {
    setChat((prev) => [...prev, message]);
  }, []);

  const setApprovedFoods = useCallback<AppActions["setApprovedFoods"]>(
    (approved) => setApprovedFoodsState(approved),
    [],
  );

  const setReminderState = useCallback<AppActions["setReminderState"]>(
    (state) => setReminderStateState(state),
    [],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Keep the signed-in user's namespaced blob so a normal sign-out/sign-in
    // round trip does not force onboarding again. Account deletion and
    // "Clear local data" remain the destructive paths.
    clearLegacy();
  }, [supabase]);

  const deleteAccount = useCallback<AppActions["deleteAccount"]>(async () => {
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error:
            (body as { error?: string }).error ??
            "Could not delete account. Please try again.",
        };
      }
    } catch {
      return {
        ok: false,
        error: "Network error. Please check your connection and try again.",
      };
    }

    // Server already cleared the Supabase session cookie. Wipe local cached
    // state for this user, plus the legacy key, so nothing of theirs lingers.
    if (storageScope && storageScope !== GUEST_SCOPE && storageScope !== DEMO_SCOPE) {
      clearPersisted(storageScope);
    }
    clearLegacy();

    // Belt-and-braces  -  also tell the browser client to drop the session.
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore  -  server already deleted the user */
      }
    }

    return { ok: true };
  }, [supabase, storageScope]);

  const startTrial = useCallback<AppActions["startTrial"]>(async () => {
    if (BILLING_ENABLED) {
      if (auth.kind !== "signed-in") {
        setNotice("Sign in before starting a subscription.");
        return false;
      }
      try {
        const nextSubscription = await purchaseRevenueCatSubscription({
          userId: auth.userId,
          email: auth.email,
        });
        setSubscriptionState(nextSubscription);
        setNotice(null);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not start subscription.";
        setNotice(message);
        return false;
      }
    }

    const now = new Date();
    const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setSubscriptionState({
      status: "trial",
      provider: "local",
      trialStartedAtIso: now.toISOString(),
      trialEndsAtIso: ends.toISOString(),
    });
    return true;
  }, [auth]);

  const cancelTrial = useCallback<AppActions["cancelTrial"]>(async () => {
    if (BILLING_ENABLED) {
      setNotice("Manage or cancel your subscription in the app store.");
      return false;
    }
    setSubscriptionState(defaultSubscription);
    return true;
  }, []);

  const expireTrial = useCallback<AppActions["expireTrial"]>(() => {
    setSubscriptionState((prev) => ({ ...prev, status: "expired" }));
  }, []);

  const restoreSubscription = useCallback<AppActions["restoreSubscription"]>(async () => {
    if (!BILLING_ENABLED) {
      return false;
    }
    if (auth.kind !== "signed-in") {
      setNotice("Sign in before restoring purchases.");
      return false;
    }
    try {
      const nextSubscription = await restoreRevenueCatSubscription({
        userId: auth.userId,
        email: auth.email,
      });
      setSubscriptionState(nextSubscription);
      setNotice(
        nextSubscription.status === "active" || nextSubscription.status === "trial"
          ? null
          : "No active subscription was found for this store account.",
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not restore purchases.";
      setNotice(message);
      return false;
    }
  }, [auth]);

  const setOnboardingExtras = useCallback<AppActions["setOnboardingExtras"]>(
    (patch) => {
      setOnboardingExtrasState((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const commitTo = useCallback<AppActions["commitTo"]>((patch) => {
    setOnboardingExtrasState((prev) => ({
      ...prev,
      commitments: { ...prev.commitments, ...patch },
    }));
  }, []);

  const completeTour = useCallback<AppActions["completeTour"]>(() => {
    setOnboardingExtrasState((prev) => ({ ...prev, hasSeenTour: true }));
  }, []);

  const setNutritionPlan = useCallback<AppActions["setNutritionPlan"]>(
    (plan) => {
      setOnboardingExtrasState((prev) => ({ ...prev, nutritionPlan: plan }));
    },
    [],
  );

  const markLessonComplete = useCallback<AppActions["markLessonComplete"]>(
    (index) => {
      setOnboardingExtrasState((prev) => {
        const plan = prev.nutritionPlan;
        if (!plan) return prev;
        if (plan.lessonsCompleted.includes(index)) return prev;
        const next: NutritionPlan = {
          ...plan,
          lessonsCompleted: [...plan.lessonsCompleted, index].sort((a, b) => a - b),
        };
        return { ...prev, nutritionPlan: next };
      });
    },
    [],
  );

  const bumpUsage = useCallback<AppActions["bumpUsage"]>((kind) => {
    setOnboardingExtrasState((prev) => {
      if (kind === "ai-photo") {
        const dayKey = todayDayKey();
        const prior = prev.aiPhotoUsage;
        const count =
          prior && prior.dayKey === dayKey ? prior.count + 1 : 1;
        return { ...prev, aiPhotoUsage: { dayKey, count } };
      }
      const weekKey = isoWeekKey();
      const prior = prev.coachUsage;
      const count = prior && prior.weekKey === weekKey ? prior.count + 1 : 1;
      return { ...prev, coachUsage: { weekKey, count } };
    });
  }, []);

  const actions = useMemo<AppActions>(
    () => ({
      setDraft,
      commitDraft,
      finishOnboarding,
      addMeal,
      addMealFromEstimate,
      updateMeal,
      removeMeal,
      addWater,
      setWater,
      setSteps,
      addWeight,
      addCheckIn,
      appendChat,
      setChat,
      setApprovedFoods,
      setReminderState,
      signOut,
      deleteAccount,
      setNotice,
      startTrial,
      cancelTrial,
      expireTrial,
      refreshSubscription,
      restoreSubscription,
      setOnboardingExtras,
      commitTo,
      completeTour,
      bumpUsage,
      setNutritionPlan,
      markLessonComplete,
    }),
    [
      commitDraft,
      finishOnboarding,
      addMeal,
      addMealFromEstimate,
      updateMeal,
      removeMeal,
      addWater,
      setWater,
      setSteps,
      addWeight,
      addCheckIn,
      appendChat,
      setApprovedFoods,
      setReminderState,
      signOut,
      deleteAccount,
      startTrial,
      cancelTrial,
      expireTrial,
      refreshSubscription,
      restoreSubscription,
      setOnboardingExtras,
      commitTo,
      completeTour,
      bumpUsage,
      setNutritionPlan,
      markLessonComplete,
    ],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      auth,
      isHydrating,
      hasOnboarded,
      profile,
      draft,
      targets,
      workoutPlan,
      meals,
      waterMl,
      steps,
      weights,
      checkIns,
      chat,
      approvedFoods,
      reminderState,
      subscription,
      onboardingExtras,
      notice,
      actions,
      lastCoachResponse,
      setLastCoachResponse,
    }),
    [
      auth,
      isHydrating,
      hasOnboarded,
      profile,
      draft,
      targets,
      workoutPlan,
      meals,
      waterMl,
      steps,
      weights,
      checkIns,
      chat,
      approvedFoods,
      reminderState,
      subscription,
      onboardingExtras,
      notice,
      actions,
      lastCoachResponse,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}

export function useTodayMeals(): MealLog[] {
  const { meals } = useAppState();
  const today = todayDayKey();
  return useMemo(() => meals.filter((m) => isSameDay(m, today)), [meals, today]);
}

export function useDayTotals() {
  const meals = useTodayMeals();
  return useMemo(
    () =>
      meals.reduce(
        (acc, m) => ({
          calories: acc.calories + m.calories,
          proteinG: acc.proteinG + m.proteinG,
          carbsG: acc.carbsG + m.carbsG,
          fatG: acc.fatG + m.fatG,
          fiberG: acc.fiberG + m.fiberG,
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      ),
    [meals],
  );
}

export function getSupabase() {
  return createSupabaseBrowserClient();
}
