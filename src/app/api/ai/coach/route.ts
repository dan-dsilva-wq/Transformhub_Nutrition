import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { coachInstructions } from "@/lib/ai/prompts";
import { getOpenAIClient, openAiModel } from "@/lib/ai/openai";
import { coachRequestSchema, coachResponseSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const client = getOpenAIClient();

  if (!client) {
    return errorResponse("OPENAI_API_KEY is required for the AI coach.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = coachRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid coach request.", 400);
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

User message:
${parsed.data.message}
`,
      text: {
        format: zodTextFormat(coachResponseSchema, "coach_response"),
      },
    });

    const coach = coachResponseSchema.parse(JSON.parse(response.output_text));

    return NextResponse.json({
      coach,
      model: openAiModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI coach failed.";
    return errorResponse(message, 502);
  }
}
