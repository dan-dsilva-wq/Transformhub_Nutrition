import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/auth";
import { recipeIdeasInstructions } from "@/lib/ai/prompts";
import { getOpenAIClient, openAiModel } from "@/lib/ai/openai";
import {
  recipeIdeasRequestSchema,
  recipeIdeasResponseSchema,
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
      "OPENAI_API_KEY is required for recipe ideas.",
      503,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = recipeIdeasRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid recipe ideas request.",
      400,
    );
  }

  const { slot, approvedFoods, dietaryPreferences, slotTargets } = parsed.data;

  try {
    const response = await client.responses.create({
      model: openAiModel,
      instructions: recipeIdeasInstructions,
      input: `
Slot: ${slot}

Slot targets (per meal): ${slotTargets.calories} kcal · ${slotTargets.proteinG}g protein · ${slotTargets.carbsG}g carbs · ${slotTargets.fatG}g fat

Dietary preferences: ${dietaryPreferences.length ? dietaryPreferences.join(", ") : "omnivore"}

Approved foods (use these): ${approvedFoods.length ? approvedFoods.join(", ") : "none. Pick simple staples"}

Return exactly 3 recipes.
`,
      text: {
        format: zodTextFormat(recipeIdeasResponseSchema, "recipe_ideas"),
      },
    });

    const ideas = recipeIdeasResponseSchema.parse(
      JSON.parse(response.output_text),
    );

    return NextResponse.json({ ideas, model: openAiModel });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Recipe ideas failed.";
    return errorResponse(message, 502);
  }
}
