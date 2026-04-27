import { describe, expect, it } from "vitest";
import {
  coachResponseSchema,
  getMealConfidenceLabel,
  mealEstimateSchema,
} from "./schemas";

describe("AI schemas", () => {
  it("accepts a valid meal estimate", () => {
    const parsed = mealEstimateSchema.parse({
      summary: "Chicken rice bowl",
      items: [
        {
          name: "Chicken",
          portion: "1 palm",
          calories: 220,
          proteinG: 40,
          carbsG: 0,
          fatG: 5,
          fiberG: 0,
          confidence: 0.8,
        },
      ],
      totals: {
        calories: 220,
        proteinG: 40,
        carbsG: 0,
        fatG: 5,
        fiberG: 0,
      },
      confidence: 0.8,
      editPrompts: ["Confirm sauce."],
      safetyNote: "Estimate only.",
    });

    expect(parsed.summary).toBe("Chicken rice bowl");
  });

  it("rejects malformed or unsafe confidence values", () => {
    expect(() =>
      mealEstimateSchema.parse({
        summary: "Meal",
        items: [],
        totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
        confidence: 1.3,
        editPrompts: [],
        safetyNote: "",
      }),
    ).toThrow();
  });

  it("accepts coach responses with risk flags and actions", () => {
    const parsed = coachResponseSchema.parse({
      reply: "Take the next action.",
      tone: "firm_supportive",
      suggestedActions: ["Log dinner"],
      checkInQuestion: "What is next?",
      riskFlag: "none",
    });

    expect(parsed.suggestedActions).toContain("Log dinner");
  });

  it("labels low confidence estimates for review", () => {
    expect(getMealConfidenceLabel(0.9)).toBe("High");
    expect(getMealConfidenceLabel(0.6)).toBe("Medium");
    expect(getMealConfidenceLabel(0.4)).toBe("Needs review");
  });
});
