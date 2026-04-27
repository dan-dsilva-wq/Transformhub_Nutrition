import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { mealEstimateInstructions } from "@/lib/ai/prompts";
import { getOpenAIClient, openAiModel } from "@/lib/ai/openai";
import {
  mealEstimateRequestSchema,
  mealEstimateSchema,
} from "@/lib/ai/schemas";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveImageUrl(input: {
  imageDataUrl?: string;
  imageUrl?: string;
  privateImagePath?: string;
  bucket?: "meal-photos" | "progress-photos";
}) {
  if (input.imageDataUrl) {
    return input.imageDataUrl;
  }

  if (input.imageUrl) {
    return input.imageUrl;
  }

  if (!input.privateImagePath) {
    throw new Error("No image provided.");
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    throw new Error("Supabase env vars are required to read private images.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const error = new Error("Sign in before estimating private meal photos.");
    error.name = "Unauthorized";
    throw error;
  }

  if (!input.privateImagePath.startsWith(`${user.id}/`)) {
    const error = new Error("Photo path does not belong to the current user.");
    error.name = "Forbidden";
    throw error;
  }

  const { data, error } = await admin.storage
    .from(input.bucket ?? "meal-photos")
    .createSignedUrl(input.privateImagePath, 90);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create a signed image URL.");
  }

  return data.signedUrl;
}

export async function POST(request: Request) {
  const client = getOpenAIClient();

  if (!client) {
    return errorResponse("OPENAI_API_KEY is required for real meal estimates.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = mealEstimateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid meal estimate request.", 400);
  }

  let imageUrl: string;

  try {
    imageUrl = await resolveImageUrl(parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read meal photo.";
    const status = error instanceof Error && error.name === "Unauthorized" ? 401 : error instanceof Error && error.name === "Forbidden" ? 403 : 503;
    return errorResponse(message, status);
  }

  try {
    const response = await client.responses.create({
      model: openAiModel,
      instructions: mealEstimateInstructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Estimate this meal for an adult weight-loss food log. User note: ${
                parsed.data.note?.trim() || "none"
              }`,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(mealEstimateSchema, "meal_estimate"),
      },
    });

    const estimate = mealEstimateSchema.parse(JSON.parse(response.output_text));

    return NextResponse.json({
      estimate,
      model: openAiModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI meal estimate failed.";
    return errorResponse(message, 502);
  }
}
