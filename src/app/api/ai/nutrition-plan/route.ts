import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/auth";
import { nutritionPlanInstructions } from "@/lib/ai/prompts";
import { getOpenAIClient, openAiModel } from "@/lib/ai/openai";
import {
  nutritionPlanRequestSchema,
  nutritionPlanResponseSchema,
} from "@/lib/ai/schemas";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authError = await requireSignedInUser();
  if (authError) return authError;

  const client = getOpenAIClient();

  if (!client) {
    return errorResponse(
      "OPENAI_API_KEY is required for nutrition plan generation.",
      503,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = nutritionPlanRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid nutrition plan request.",
      400,
    );
  }

  const { name, targets, mealsPerDay, dietaryPreferences, approvedFoods } =
    parsed.data;

  try {
    const response = await client.responses.create({
      model: openAiModel,
      instructions: nutritionPlanInstructions,
      input: `
User name: ${name ?? "(not provided)"}

Daily targets:
- ${targets.calories} kcal
- ${targets.proteinG}g protein
- ${targets.carbsG}g carbs
- ${targets.fatG}g fat
- ${targets.fiberG}g fiber
- ${targets.waterMl} ml water

Meals per day: ${mealsPerDay}

Dietary preferences: ${dietaryPreferences.length ? dietaryPreferences.join(", ") : "omnivore"}

Approved foods: ${approvedFoods.length ? approvedFoods.join(", ") : "(none provided)"}

Write the 8 lessons now.
`,
      text: {
        format: zodTextFormat(nutritionPlanResponseSchema, "nutrition_plan"),
      },
    });

    const copy = nutritionPlanResponseSchema.parse(
      JSON.parse(response.output_text),
    );

    return NextResponse.json({ copy, model: openAiModel });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nutrition plan generation failed.";
    return errorResponse(message, 502);
  }
}
