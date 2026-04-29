export type SexForCalories = "female" | "male";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active";

export type UnitSystem = "metric" | "imperial";

export type AccountabilityStyle = "gentle" | "firm" | "tough";

export type EquipmentPreference = "none" | "bands" | "dumbbells" | "gym";

interface ProfileGuardrailInput {
  age: number;
  pregnant?: boolean;
  eatingDisorderRecovery?: boolean;
  medicalConditionPlan?: boolean;
}

export interface TargetProfile extends ProfileGuardrailInput {
  sexForCalories: SexForCalories;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  baselineSteps?: number;
  workoutsPerWeek?: number;
}

export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  steps: number;
  rmr: number;
  tdee: number;
  deficit: number;
  weeklyLossKg: number;
  workoutsPerWeek: number;
  exerciseMinutesPerWeek: number;
  notes: string[];
}

export interface WorkoutDay {
  day: string;
  focus: string;
  durationMinutes: number;
  exercises: string[];
  intensity: "easy" | "moderate" | "hard";
}

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

export function checkProfileGuardrails(input: ProfileGuardrailInput) {
  const reasons: string[] = [];

  if (!Number.isFinite(input.age) || input.age < 18) {
    reasons.push("This beta supports adults only.");
  }

  if (input.pregnant) {
    reasons.push("Pregnancy nutrition targets should be set with a clinician.");
  }

  if (input.eatingDisorderRecovery) {
    reasons.push("Eating disorder recovery needs specialist support, not weight-loss automation.");
  }

  if (input.medicalConditionPlan) {
    reasons.push("Medical-condition-specific plans need clinician guidance.");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

function calculateRmr(profile: Pick<TargetProfile, "sexForCalories" | "heightCm" | "currentWeightKg" | "age">) {
  const sexAdjustment = profile.sexForCalories === "male" ? 5 : -161;

  return Math.round(
    10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * profile.age + sexAdjustment,
  );
}

export function calculateStepTarget({
  baselineSteps,
  recentAverageSteps,
}: {
  baselineSteps?: number;
  recentAverageSteps?: number;
}) {
  const baseline = recentAverageSteps ?? baselineSteps;

  if (!baseline || baseline < 1000) {
    return 7000;
  }

  if (baseline < 5000) {
    return roundTo(clamp(baseline + 1000, 4500, 7000), 250);
  }

  if (baseline < 8000) {
    return roundTo(clamp(baseline + 1250, 6500, 9000), 250);
  }

  return roundTo(clamp(baseline + 750, 8500, 11000), 250);
}

export function calculateWaterTargetMl(weightKg: number, workoutDay = false) {
  const base = clamp(weightKg * 35, 1800, 3800);
  const workoutAdjustment = workoutDay ? 500 : 0;

  return roundTo(base + workoutAdjustment, 100);
}

export function calculateDailyTargets(profile: TargetProfile): DailyTargets {
  const guardrails = checkProfileGuardrails(profile);

  if (!guardrails.ok) {
    throw new Error(guardrails.reasons.join(" "));
  }

  const rmr = calculateRmr(profile);
  const tdee = Math.round(rmr * activityMultipliers[profile.activityLevel]);
  const wantsWeightLoss = profile.goalWeightKg < profile.currentWeightKg;
  const rawDeficit = wantsWeightLoss ? clamp(tdee * 0.2, 300, 750) : 250;
  const calorieFloor = profile.sexForCalories === "male" ? 1500 : 1200;
  const calories = roundTo(Math.max(tdee - rawDeficit, calorieFloor), 25);
  const deficit = Math.max(tdee - calories, 0);
  const weeklyLossKg = Number(((deficit * 7) / 7700).toFixed(2));

  const proteinG = roundTo(clamp(profile.currentWeightKg * 1.8, 95, 210), 5);
  const fatG = roundTo(clamp((calories * 0.28) / 9, 45, 95), 5);
  const carbsG = roundTo(Math.max((calories - proteinG * 4 - fatG * 9) / 4, 80), 5);
  const fiberG = roundTo(clamp((calories / 1000) * 14, 25, 42), 1);
  const workoutsPerWeek = clamp(profile.workoutsPerWeek ?? 3, 2, 5);

  const notes = [
    "Targets are adjustable and designed for gradual weight loss.",
    "Photo estimates should be confirmed before they count.",
  ];

  if (weeklyLossKg > 0.9) {
    notes.push("If hunger, fatigue, or dizziness shows up, raise calories and check in with a professional.");
  }

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    waterMl: calculateWaterTargetMl(profile.currentWeightKg),
    steps: calculateStepTarget({ baselineSteps: profile.baselineSteps }),
    rmr,
    tdee,
    deficit,
    weeklyLossKg,
    workoutsPerWeek,
    exerciseMinutesPerWeek: workoutsPerWeek * 30 + 120,
    notes,
  };
}

export function createBusyHomeWorkoutPlan(equipment: EquipmentPreference = "none"): WorkoutDay[] {
  const resistanceMove =
    equipment === "dumbbells"
      ? "Dumbbell rows"
      : equipment === "bands"
        ? "Band rows"
        : "Backpack rows";

  return [
    {
      day: "Monday",
      focus: "Lower body and walk",
      durationMinutes: 35,
      intensity: "moderate",
      exercises: ["10 min brisk walk", "Squats", "Reverse lunges", "Glute bridges", "Calf raises"],
    },
    {
      day: "Tuesday",
      focus: "Steps and mobility",
      durationMinutes: 25,
      intensity: "easy",
      exercises: ["20 min walk", "Hip flexor stretch", "Thoracic rotations"],
    },
    {
      day: "Wednesday",
      focus: "Upper body",
      durationMinutes: 30,
      intensity: "moderate",
      exercises: ["Incline push-ups", resistanceMove, "Shoulder taps", "Dead bugs"],
    },
    {
      day: "Friday",
      focus: "Full body circuit",
      durationMinutes: 32,
      intensity: "hard",
      exercises: ["Step-ups", "Push-ups", "Rows", "Plank", "Fast walk finisher"],
    },
    {
      day: "Sunday",
      focus: "Reset walk",
      durationMinutes: 40,
      intensity: "easy",
      exercises: ["Long easy walk", "Light stretching", "Weekly check-in"],
    },
  ];
}
