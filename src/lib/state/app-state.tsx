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
  OnboardingExtras,
  ProfileDraft,
  Subscription,
  WeightEntry,
} from "./types";

const LOCAL_STATE_KEY = "pace.state.v1";

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

function loadPersisted(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedShape) : null;
  } catch {
    return null;
  }
}

function persist(state: PersistedShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — ignore */
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

  const [isHydrating, setIsHydrating] = useState<boolean>(Boolean(supabase));
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);

  const [profile, setProfile] = useState<TargetProfile>(demoProfile);
  const [draft, setDraft] = useState<ProfileDraft>(profileToDraft(demoProfile));
  const [targets, setTargets] = useState(demoTargets);
  const [workoutPlan, setWorkoutPlan] = useState(demoWorkoutPlan);

  const [meals, setMeals] = useState<MealLog[]>(() =>
    demoMeals.map((meal, index) => ({
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

  const [waterMl, setWaterMl] = useState<number>(1450);
  const [steps, setStepsState] = useState<number>(6200);
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

  // Hydrate from localStorage on first paint (demo mode + offline cache).
  // Reading localStorage is an external-system subscription on mount, so the
  // setState calls below are intentional.
  useEffect(() => {
    const persisted = loadPersisted();
    if (!persisted) return;

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
  }, []);

  // Persist on changes.
  useEffect(() => {
    persist({
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

  // Auth wiring (light — full sync logic intentionally simplified for this rebuild).
  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const hydrationTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setAuth((current) =>
        current.kind === "signed-in" ? current : { kind: "signed-out" },
      );
      setIsHydrating(false);
    }, 5000);

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      window.clearTimeout(hydrationTimeout);
      const u = data.user;
      if (u) {
        setAuth({ kind: "signed-in", userId: u.id, email: u.email ?? null });
      } else {
        setAuth({ kind: "signed-out" });
      }
      setIsHydrating(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user;
      if (u) {
        setAuth({ kind: "signed-in", userId: u.id, email: u.email ?? null });
      } else {
        setAuth({ kind: "signed-out" });
      }
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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_STATE_KEY);
    }
  }, [supabase]);

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
      setNotice,
      startTrial,
      cancelTrial,
      expireTrial,
      setOnboardingExtras,
      commitTo,
      completeTour,
      bumpUsage,
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
      startTrial,
      cancelTrial,
      expireTrial,
      setOnboardingExtras,
      commitTo,
      completeTour,
      bumpUsage,
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
