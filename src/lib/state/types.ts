import type { CoachDraftMeal, CoachResponse, MealEstimate } from "@/lib/ai/schemas";
import type {
  AccountabilityStyle,
  ActivityLevel,
  DailyTargets,
  EquipmentPreference,
  GoalIntent,
  SexForCalories,
  TargetProfile,
  UnitSystem,
  WorkoutDay,
} from "@/lib/targets";

export interface MealLog {
  id: string;
  name: string;
  /** ISO timestamp */
  loggedAt: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  imageUrl?: string;
  confidence?: number;
}

export interface WeightEntry {
  date: string;
  /** ISO day string for filtering and chart ranges. Older local entries may not have this. */
  isoDate?: string;
  weightKg: number;
}

export interface CheckIn {
  id: string;
  date: string;
  /** ISO day string for sorting/comparison. Older local entries may not have this. */
  isoDate?: string;
  note: string;
  photoUrl: string | null;
  energy?: number;
  hunger?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  draftMeal?: CoachDraftMeal;
}

export interface ProfileDraft {
  age: string;
  sexForCalories: SexForCalories;
  units: UnitSystem;
  heightCm: string;
  currentWeightKg: string;
  goalWeightKg: string;
  goalIntent: GoalIntent;
  weeklyRateKg: string;
  activityLevel: ActivityLevel;
  baselineSteps: string;
  workoutsPerWeek: string;
  equipment: EquipmentPreference;
  accountabilityStyle: AccountabilityStyle;
  approvedFoods: string[];
}

export type AuthStatus =
  | { kind: "demo" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; userId: string; email: string | null };

type SubscriptionStatus = "none" | "trial" | "active" | "expired";

export interface Subscription {
  status: SubscriptionStatus;
  provider?: "local" | "revenuecat" | "manual" | string;
  providerAppUserId?: string;
  entitlementId?: string;
  productId?: string;
  store?: string;
  environment?: string;
  trialStartedAtIso?: string;
  trialEndsAtIso?: string;
  currentPeriodEndsAtIso?: string;
  plan?: "monthly" | "yearly";
}

export type DietaryPref =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "no-dairy"
  | "no-gluten"
  | "no-peanuts"
  | "no-tree-nuts"
  | "no-fish"
  | "no-shellfish"
  | "no-soy"
  | "no-eggs"
  | "no-sesame"
  | "halal"
  | "kosher";

interface NutritionLessonCopy {
  headline: string;
  body: string;
  bullets: string[];
}

export interface NutritionPlan {
  generatedAtIso: string;
  basis: {
    calories: number;
    proteinG: number;
    mealsPerDay: number;
    dietaryPreferences: DietaryPref[];
  };
  copy: {
    overview: NutritionLessonCopy;
    protein: NutritionLessonCopy;
    carbs: NutritionLessonCopy;
    fats: NutritionLessonCopy;
    fiber: NutritionLessonCopy;
    beverages: NutritionLessonCopy;
    plate: NutritionLessonCopy;
    timing: NutritionLessonCopy;
  };
  lessonsCompleted: number[];
}

export interface OnboardingExtras {
  name?: string;
  motivation?: string;
  dietaryPreferences: DietaryPref[];
  routine?: { wakeAt?: string; sleepAt?: string; mealsPerDay?: number };
  goalDateIso?: string;
  commitments: { steps: boolean; water: boolean; nutrition: boolean };
  hasSeenTour: boolean;
  /** Tracks AI photo estimate usage per UTC day for the free-tier 3/day cap. */
  aiPhotoUsage?: { dayKey: string; count: number };
  /** Tracks Coach message usage per ISO week for the free-tier 5/week cap. */
  coachUsage?: { weekKey: string; count: number };
  nutritionPlan?: NutritionPlan;
  /** Names of foods the user has explicitly removed from the master list. Empty/undefined = all liked. */
  unlikedFoods?: string[];
  /** Selected diet preset for the food list filter. Defaults to "omnivore". */
  foodDiet?: "omnivore" | "pescatarian" | "vegetarian" | "vegan";
  /** Whether the user has dismissed the first-time food guide walkthrough. */
  hasSeenFoodIntro?: boolean;
  /** Recipe keys the user has banned from showing up in the week plan. */
  bannedRecipes?: string[];
  /** Per-position recipe overrides for the week plan. Key is `${weekIdx}|${dayIdx}|${slotIdx}`. */
  weekSwaps?: Record<string, string>;
  /** Whether the user has run the first-time week generator. */
  weekGenerated?: boolean;
  /** Seed used to keep the generated food week and shopping list in sync. */
  weekPlanSeed?: number;
  /** Ingredient names the user never wants suggested again (case-insensitive match). */
  skippedIngredients?: string[];
  /** Ingredient names the user has marked as already in their pantry — hidden from shopping list. */
  pantryStaples?: string[];
  /** Per-shopping-list-week, set of checked-off ingredient keys. Key is `${weekIdx}:${ingredientName}`. */
  shoppingChecked?: string[];
  /** Whether the user has dismissed the editorial-week walkthrough. */
  hasSeenWeekIntro?: boolean;
  /** Number of future weeks the user has manually generated beyond the current week. 0..4. */
  weeksAhead?: number;
}

interface AppState {
  /** Auth status. "demo" means Supabase is unconfigured or ?demo=1 was set. */
  auth: AuthStatus;
  /** True before profile/targets have been loaded for a real user. */
  isHydrating: boolean;
  /** Whether the user has completed onboarding (or is in demo). */
  hasOnboarded: boolean;

  profile: TargetProfile;
  draft: ProfileDraft;
  targets: DailyTargets;
  workoutPlan: WorkoutDay[];

  meals: MealLog[];
  waterMl: number;
  steps: number;
  weights: WeightEntry[];
  checkIns: CheckIn[];
  chat: ChatMessage[];

  approvedFoods: string[];
  reminderState: "off" | "on";

  subscription: Subscription;
  onboardingExtras: OnboardingExtras;

  notice: string | null;
}

export interface AppActions {
  /** Update the editable profile draft and recalculate targets when committed. */
  setDraft(draft: ProfileDraft): void;
  /** Persist the current draft to profile and targets. */
  commitDraft(): void;
  /** Mark onboarding done (commits draft if needed). */
  finishOnboarding(): void;

  addMeal(
    meal: Omit<MealLog, "id" | "loggedAt"> & {
      loggedAt?: string;
      source?: "manual" | "coach";
    },
  ): MealLog;
  addMealFromEstimate(estimate: MealEstimate, opts?: { imageUrl?: string }): MealLog;
  updateMeal(id: string, patch: Partial<Omit<MealLog, "id">>): void;
  removeMeal(id: string): void;

  addWater(ml: number): void;
  setWater(ml: number): void;
  setSteps(steps: number): void;

  addWeight(weightKg: number): void;
  addCheckIn(checkIn: Omit<CheckIn, "id" | "date"> & { date?: string }): void;

  appendChat(message: ChatMessage): void;
  setChat(messages: ChatMessage[]): void;

  setApprovedFoods(approved: string[]): void;
  setReminderState(state: "off" | "on"): void;

  signOut(): Promise<void>;
  deleteAccount(): Promise<{ ok: true } | { ok: false; error: string }>;
  setNotice(notice: string | null): void;

  startTrial(): Promise<boolean>;
  cancelTrial(): Promise<boolean>;
  expireTrial(): void;
  refreshSubscription(): Promise<void>;
  restoreSubscription(): Promise<boolean>;
  setOnboardingExtras(patch: Partial<OnboardingExtras>): void;
  commitTo(patch: Partial<OnboardingExtras["commitments"]>): void;
  completeTour(): void;
  bumpUsage(kind: "ai-photo" | "coach"): void;
  setNutritionPlan(plan: NutritionPlan): void;
  markLessonComplete(index: number): void;
}

export interface AppContextValue extends AppState {
  actions: AppActions;
  /** Coach response, kept here so /you/coach and the home nudge card share state. */
  lastCoachResponse: CoachResponse | null;
  setLastCoachResponse(response: CoachResponse | null): void;
}
