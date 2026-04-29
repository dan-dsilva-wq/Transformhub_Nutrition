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
  type TargetProfile,
} from "@/lib/targets";
import type { CoachResponse, MealEstimate } from "@/lib/ai/schemas";
import { createStorageObjectId } from "@/lib/storage-id";
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
  return {
    age: String(profile.age),
    sexForCalories: profile.sexForCalories,
    units: "metric",
    heightCm: String(profile.heightCm),
    currentWeightKg: String(profile.currentWeightKg),
    goalWeightKg: String(profile.goalWeightKg),
    activityLevel: profile.activityLevel,
    baselineSteps: String(profile.baselineSteps ?? 5600),
    workoutsPerWeek: String(profile.workoutsPerWeek ?? 3),
    equipment: "bands",
    accountabilityStyle: "firm",
    approvedFoods: defaultApprovedFoods,
  };
}

function numOr(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function draftToProfile(draft: ProfileDraft): TargetProfile {
  return {
    age: numOr(draft.age, 30),
    sexForCalories: draft.sexForCalories,
    heightCm: numOr(draft.heightCm, 170),
    currentWeightKg: numOr(draft.currentWeightKg, 80),
    goalWeightKg: numOr(draft.goalWeightKg, 72),
    activityLevel: draft.activityLevel,
    baselineSteps: numOr(draft.baselineSteps, 5000),
    workoutsPerWeek: numOr(draft.workoutsPerWeek, 3),
  };
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
  /** date string of the currently-loaded "day" — used to reset water/steps daily */
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
    /* quota or private mode — ignore */
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

const defaultSubscription: Subscription = { status: "none" };

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
      // Real user — adopt any pre-fix legacy blob into their namespace once.
      migrateLegacyInto(storageScope);
    }

    const persisted = loadPersisted(storageScope);
    if (!persisted) {
      setHasHydrated(true);
      return;
    }

    const today = todayDayKey();
    const wasToday = persisted.dayKey === today;

    if (persisted.profile) {
      setProfile(persisted.profile);
      try {
        setTargets(calculateDailyTargets(persisted.profile));
      } catch {
        /* invalid persisted profile; ignore */
      }
    }
    if (persisted.draft) setDraft(persisted.draft);
    if (persisted.meals) setMeals(persisted.meals);
    if (persisted.weights) setWeights(withoutSeedWeights(persisted.weights));
    if (persisted.checkIns) setCheckIns(persisted.checkIns);
    if (persisted.chat?.length) setChat(persisted.chat);
    if (persisted.approvedFoods) setApprovedFoodsState(persisted.approvedFoods);
    if (persisted.reminderState) setReminderStateState(persisted.reminderState);
    if (persisted.hasOnboarded) setHasOnboarded(true);
    if (persisted.subscription) {
      const sub = persisted.subscription;
      const isExpired =
        sub.status === "trial" &&
        sub.trialEndsAtIso &&
        Date.now() > Date.parse(sub.trialEndsAtIso);
      setSubscriptionState(isExpired ? { ...sub, status: "expired" } : sub);
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
      // new day — reset daily counters
      setWaterMl(0);
      setStepsState(0);
    }

    dayKeyRef.current = today;
    setHasHydrated(true);
  }, [storageScope]);

  // Persist on changes — only after hydration into the current scope is
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
        /* ignore — bad URL */
      }
    }).then((handle) => {
      listener = handle;
    });
    return () => {
      listener?.remove();
    };
  }, [supabase]);

  // Auth wiring (light — full sync logic intentionally simplified for this rebuild).
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
    setProfile(next);
    try {
      setTargets(calculateDailyTargets(next));
    } catch {
      /* guardrail tripped — keep prior targets */
    }
    setWorkoutPlan(createBusyHomeWorkoutPlan(draft.equipment));
  }, [draft]);

  const finishOnboarding = useCallback(() => {
    const next = draftToProfile(draft);
    setProfile(next);
    try {
      setTargets(calculateDailyTargets(next));
    } catch {
      /* guardrail — still mark onboarded so user can edit later */
    }
    setWorkoutPlan(createBusyHomeWorkoutPlan(draft.equipment));
    setHasOnboarded(true);
  }, [draft]);

  const addMeal = useCallback<AppActions["addMeal"]>((meal) => {
    const id = createStorageObjectId();
    const loggedAt = meal.loggedAt ?? new Date().toISOString();
    const next: MealLog = { id, loggedAt, ...meal };
    setMeals((prev) => [next, ...prev]);
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
    const entry: WeightEntry = {
      date: todayLabel(),
      isoDate: todayIsoDate(),
      weightKg: Math.round(weightKg * 10) / 10,
    };
    setWeights((prev) => [...prev, entry]);
    setProfile((prev) => ({ ...prev, currentWeightKg: entry.weightKg }));
    setDraft((prev) => ({ ...prev, currentWeightKg: String(entry.weightKg) }));
  }, []);

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
    // Wipe the just-signed-out user's namespaced blob so it can't be re-read
    // if anyone signs back in on this device. The auth listener will flip
    // storageScope to GUEST and reset in-memory state.
    if (storageScope && storageScope !== GUEST_SCOPE && storageScope !== DEMO_SCOPE) {
      clearPersisted(storageScope);
    }
    clearLegacy();
  }, [supabase, storageScope]);

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

    // Belt-and-braces — also tell the browser client to drop the session.
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore — server already deleted the user */
      }
    }

    return { ok: true };
  }, [supabase, storageScope]);

  const startTrial = useCallback<AppActions["startTrial"]>(() => {
    const now = new Date();
    const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setSubscriptionState({
      status: "trial",
      trialStartedAtIso: now.toISOString(),
      trialEndsAtIso: ends.toISOString(),
    });
  }, []);

  const cancelTrial = useCallback<AppActions["cancelTrial"]>(() => {
    setSubscriptionState({ status: "none" });
  }, []);

  const expireTrial = useCallback<AppActions["expireTrial"]>(() => {
    setSubscriptionState((prev) => ({ ...prev, status: "expired" }));
  }, []);

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
