import { describe, expect, it } from "vitest";
import {
  calculateDailyTargets,
  calculateStepTarget,
  calculateWaterTargetMl,
  checkProfileGuardrails,
  resolveGoalIntent,
  suggestedGoalWeightKg,
} from "./targets";

describe("target calculations", () => {
  it("calculates gradual weight-loss targets with macros and daily habits", () => {
    const targets = calculateDailyTargets({
      age: 34,
      sexForCalories: "female",
      heightCm: 168,
      currentWeightKg: 82,
      goalWeightKg: 72,
      goalIntent: "lose",
      weeklyRateKg: 0.5,
      activityLevel: "light",
      baselineSteps: 5600,
      workoutsPerWeek: 3,
    });

    expect(targets.calories).toBeGreaterThanOrEqual(1200);
    expect(targets.deficit).toBeGreaterThanOrEqual(250);
    expect(targets.weeklyLossKg).toBeGreaterThan(0);
    expect(targets.weeklyWeightChangeKg).toBeLessThan(0);
    expect(targets.proteinG).toBeGreaterThanOrEqual(95);
    expect(targets.fiberG).toBeGreaterThanOrEqual(25);
    expect(targets.steps).toBeGreaterThan(5600);
    expect(targets.exerciseMinutesPerWeek).toBeGreaterThanOrEqual(180);
  });

  it("blocks profiles outside adult wellness guardrails", () => {
    expect(checkProfileGuardrails({ age: 17 }).ok).toBe(false);
    expect(checkProfileGuardrails({ age: 35, pregnant: true }).reasons[0]).toContain("Pregnancy");
    expect(() =>
      calculateDailyTargets({
        age: 16,
        sexForCalories: "male",
        heightCm: 178,
        currentWeightKg: 90,
        goalWeightKg: 80,
        goalIntent: "lose",
        weeklyRateKg: 0.5,
        activityLevel: "moderate",
      }),
    ).toThrow("adults only");
  });

  it("progresses step targets from baseline without jumping too aggressively", () => {
    expect(calculateStepTarget({ baselineSteps: 3000 })).toBe(4500);
    expect(calculateStepTarget({ baselineSteps: 6200 })).toBe(7500);
    expect(calculateStepTarget({ baselineSteps: 9500 })).toBe(10250);
  });

  it("keeps water targets in a sensible range", () => {
    expect(calculateWaterTargetMl(50)).toBe(1800);
    expect(calculateWaterTargetMl(82)).toBe(2900);
    expect(calculateWaterTargetMl(130, true)).toBe(4300);
  });

  it("supports every goal intent with signed weekly change", () => {
    const base = {
      age: 34,
      sexForCalories: "female" as const,
      heightCm: 168,
      currentWeightKg: 80,
      activityLevel: "light" as const,
    };

    expect(calculateDailyTargets({ ...base, goalIntent: "lose", goalWeightKg: 76, weeklyRateKg: 0.5 }).weeklyWeightChangeKg).toBeLessThan(0);
    expect(calculateDailyTargets({ ...base, goalIntent: "maintain", goalWeightKg: 80, weeklyRateKg: 0 }).weeklyWeightChangeKg).toBe(0);
    expect(calculateDailyTargets({ ...base, goalIntent: "gain", goalWeightKg: 83, weeklyRateKg: 0.25 }).weeklyWeightChangeKg).toBeGreaterThan(0);
    expect(calculateDailyTargets({ ...base, goalIntent: "build-muscle", goalWeightKg: 80, weeklyRateKg: 0 }).weeklyWeightChangeKg).toBe(0);
  });

  it("allows a 1.2 kg weekly loss request while keeping calorie floors", () => {
    const targets = calculateDailyTargets({
      age: 34,
      sexForCalories: "female",
      heightCm: 168,
      currentWeightKg: 67,
      goalWeightKg: 60,
      goalIntent: "lose",
      weeklyRateKg: 1.2,
      activityLevel: "sedentary",
    });

    expect(targets.calories).toBeGreaterThanOrEqual(1200);
    expect(targets.weeklyLossKg).toBeLessThanOrEqual(1.2);
    expect(targets.notes.join(" ")).toContain("aggressive");
  });

  it("keeps legacy profiles backwards compatible", () => {
    expect(resolveGoalIntent({ currentWeightKg: 82, goalWeightKg: 72 })).toBe("lose");
    expect(resolveGoalIntent({ currentWeightKg: 72, goalWeightKg: 72 })).toBe("maintain");
    expect(resolveGoalIntent({ currentWeightKg: 67, goalWeightKg: 72 })).toBe("gain");
    expect(suggestedGoalWeightKg(67, "lose")).toBe(63.6);
  });
});
