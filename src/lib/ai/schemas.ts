import { z } from "zod";

const mealItemSchema = z.object({
  name: z.string().min(1),
  portion: z.string().min(1),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const mealEstimateSchema = z.object({
  summary: z.string().min(1),
  items: z.array(mealItemSchema).min(1),
  totals: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
    fiberG: z.number().nonnegative(),
  }),
  confidence: z.number().min(0).max(1),
  editPrompts: z.array(z.string()).max(5),
  safetyNote: z.string(),
});

export const mealEstimateRequestSchema = z
  .object({
    privateImagePath: z.string().min(1).optional(),
    bucket: z.enum(["meal-photos", "progress-photos"]).default("meal-photos").optional(),
    imageUrl: z.url().optional(),
    imageDataUrl: z.string().startsWith("data:image/").optional(),
    note: z.string().max(500).optional(),
  })
  .refine((value) => value.privateImagePath || value.imageUrl || value.imageDataUrl, {
    message: "Provide privateImagePath, imageUrl, or imageDataUrl.",
  });

export const coachRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  profileSummary: z.string().max(1200).optional(),
  recentSummary: z.string().max(2000).optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1000),
      }),
    )
    .max(5)
    .optional(),
});

export const coachDraftMealSchema = z.object({
  name: z.string().min(1).max(100),
  portion: z.string().min(1).max(80).nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const coachResponseSchema = z.object({
  reply: z.string().min(1),
  tone: z.enum(["firm_supportive", "gentle_supportive"]),
  suggestedActions: z.array(z.string()).max(4),
  checkInQuestion: z.string().min(1),
  riskFlag: z.enum(["none", "medical", "disordered_eating", "injury"]),
  draftMeal: coachDraftMealSchema.nullable(),
});

export const recipeIdeasRequestSchema = z.object({
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  approvedFoods: z.array(z.string().min(1)).max(60),
  dietaryPreferences: z
    .array(
      z.enum([
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "no-dairy",
        "no-gluten",
        "no-peanuts",
        "no-tree-nuts",
        "no-fish",
        "no-shellfish",
        "no-soy",
        "no-eggs",
        "no-sesame",
        "halal",
        "kosher",
      ]),
    )
    .max(8),
  slotTargets: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  }),
});

const recipeIdeaSchema = z.object({
  name: z.string().min(1).max(60),
  parts: z.array(z.string().min(1)).min(2).max(6),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  tags: z.array(z.string().min(1)).max(4),
});

export const recipeIdeasResponseSchema = z.object({
  recipes: z.array(recipeIdeaSchema).min(1).max(4),
});

export const nutritionPlanRequestSchema = z.object({
  name: z.string().max(40).optional(),
  targets: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
    fiberG: z.number().nonnegative(),
    waterMl: z.number().nonnegative(),
  }),
  mealsPerDay: z.number().int().min(2).max(5),
  dietaryPreferences: z
    .array(
      z.enum([
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "no-dairy",
        "no-gluten",
        "no-peanuts",
        "no-tree-nuts",
        "no-fish",
        "no-shellfish",
        "no-soy",
        "no-eggs",
        "no-sesame",
        "halal",
        "kosher",
      ]),
    )
    .max(8),
  approvedFoods: z.array(z.string().min(1)).max(60),
});

const nutritionLessonCopySchema = z.object({
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(900),
  bullets: z.array(z.string().min(1).max(160)).min(2).max(3),
});

export const nutritionPlanResponseSchema = z.object({
  overview: nutritionLessonCopySchema,
  protein: nutritionLessonCopySchema,
  carbs: nutritionLessonCopySchema,
  fats: nutritionLessonCopySchema,
  fiber: nutritionLessonCopySchema,
  beverages: nutritionLessonCopySchema,
  plate: nutritionLessonCopySchema,
  timing: nutritionLessonCopySchema,
});

export type MealEstimate = z.infer<typeof mealEstimateSchema>;
export type CoachResponse = z.infer<typeof coachResponseSchema>;
export type CoachDraftMeal = z.infer<typeof coachDraftMealSchema>;

export function getMealConfidenceLabel(confidence: number) {
  if (confidence >= 0.8) {
    return "High";
  }

  if (confidence >= 0.55) {
    return "Medium";
  }

  return "Needs review";
}
