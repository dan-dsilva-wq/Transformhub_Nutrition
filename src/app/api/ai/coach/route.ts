import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/api/auth";
import {
  guardrailCoachResponse,
  inferDraftMealFromMessage,
  sanitizeCoachResponse,
} from "@/lib/ai/coach";
import { coachInstructions } from "@/lib/ai/prompts";
import { getOpenAIClient, openAiModel } from "@/lib/ai/openai";
import { coachRequestSchema, coachResponseSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function formatRecentMessages(
  messages: Array<{ role: "user" | "assistant"; content: string }> | undefined,
) {
  if (!messages?.length) return "No recent conversation.";

  return messages
    .slice(-5)
    .map((message) => `${message.role === "user" ? "User" : "Coach"}: ${message.content}`)
    .join("\n");
}

export async function POST(request: Request) {
  const authError = await requireSignedInUser();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = coachRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid coach request.", 400);
  }

  const guardrail = guardrailCoachResponse(parsed.data.message);
  if (guardrail) {
    return NextResponse.json({ coach: sanitizeCoachResponse(guardrail) });
  }

  const client = getOpenAIClient();

  if (!client) {
    return errorResponse("OPENAI_API_KEY is required for the AI coach.", 503);
  }

  try {
    const response = await client.responses.create({
      model: openAiModel,
      instructions: coachInstructions,
      input: `
Profile summary:
${parsed.data.profileSummary || "No profile summary provided."}

Recent progress:
${parsed.data.recentSummary || "No recent summary provided."}

Recent conversation, oldest to newest:
${formatRecentMessages(parsed.data.recentMessages)}

User message:
${parsed.data.message}
`,
      text: {
        format: zodTextFormat(coachResponseSchema, "coach_response"),
      },
    });

    const coach = sanitizeCoachResponse(
      coachResponseSchema.parse(JSON.parse(response.output_text)),
    );
    const draftMeal = coach.draftMeal ?? inferDraftMealFromMessage(parsed.data.message) ?? undefined;
    const coachWithoutDraft = {
      reply: coach.reply,
      tone: coach.tone,
      suggestedActions: draftMeal ? [] : coach.suggestedActions,
      checkInQuestion: coach.checkInQuestion,
      riskFlag: coach.riskFlag,
    };

    return NextResponse.json({
      coach: draftMeal ? { ...coachWithoutDraft, draftMeal } : coachWithoutDraft,
      model: openAiModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI coach failed.";
    return errorResponse(message, 502);
  }
}
