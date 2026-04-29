import { calculateDailyTargets, createBusyHomeWorkoutPlan, type TargetProfile } from "@/lib/targets";

export const demoProfile: TargetProfile = {
  age: 34,
  sexForCalories: "female",
  heightCm: 168,
  currentWeightKg: 82,
  goalWeightKg: 72,
  activityLevel: "light",
  baselineSteps: 5600,
  workoutsPerWeek: 3,
};

export const demoTargets = calculateDailyTargets(demoProfile);

export const demoWorkoutPlan = createBusyHomeWorkoutPlan("bands");

export const demoMeals = [
  {
    name: "Greek yogurt bowl",
    time: "08:15",
    calories: 420,
    proteinG: 38,
    carbsG: 45,
    fatG: 12,
    fiberG: 9,
  },
  {
    name: "Chicken rice box",
    time: "12:40",
    calories: 610,
    proteinG: 48,
    carbsG: 62,
    fatG: 17,
    fiberG: 8,
  },
];
