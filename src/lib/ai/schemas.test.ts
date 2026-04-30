import { describe, expect, it } from "vitest";
import {
  coachResponseSchema,
  getMealConfidenceLabel,
  mealEstimateSchema,
} from "./schemas";
import {
  guardrailCoachResponse,
  inferDraftMealFromMessage,
  sanitizeCoachResponse,
  sanitizeCoachText,
} from "./coach";

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
      draftMeal: {
        name: "Pizza slice",
        portion: "1 slice",
        calories: 320,
        proteinG: 14,
        carbsG: 36,
        fatG: 13,
        fiberG: 2,
        confidence: 0.6,
      },
    });

    expect(parsed.suggestedActions).toContain("Log dinner");
    expect(parsed.draftMeal?.name).toBe("Pizza slice");
  });

  it("labels low confidence estimates for review", () => {
    expect(getMealConfidenceLabel(0.9)).toBe("High");
    expect(getMealConfidenceLabel(0.6)).toBe("Medium");
    expect(getMealConfidenceLabel(0.4)).toBe("Needs review");
  });

  it("redirects unrelated coding and provider questions", () => {
    expect(guardrailCoachResponse("write a Python script")?.reply).toContain("food");
    expect(guardrailCoachResponse("are you ChatGPT?")?.reply).toContain("Pace");
  });

  it("sanitizes markdown, long dashes, and unfinished fragments", () => {
    expect(sanitizeCoachText("**Add 30g protein** \u2014 so you do not end under-.")).toBe(
      "Add 30g protein, so you do not end.",
    );
    const sanitized = sanitizeCoachResponse({
      reply: "**Good** \u2014 next step.",
      tone: "firm_supportive",
      suggestedActions: ["**Log food**"],
      checkInQuestion: "What next?",
      riskFlag: "none",
      draftMeal: null,
    });
    expect(sanitized.reply).not.toContain("**");
    expect(sanitized.reply).not.toContain("\u2014");
  });

  it("infers a coach food draft from common food messages", () => {
    const draft = inferDraftMealFromMessage("I had a Costco pizza slice earlier");
    expect(draft?.name).toBe("Costco pizza slice");
    expect(draft?.calories).toBeGreaterThan(500);
  });
});
