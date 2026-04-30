import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateDailyTargets } from "@/lib/targets";

export const runtime = "nodejs";

const recalculateTargetsSchema = z.object({
  age: z.number().int().min(18).max(100),
  sexForCalories: z.enum(["female", "male"]),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(35).max(300),
  goalWeightKg: z.number().min(35).max(300),
  goalIntent: z.enum(["lose", "maintain", "gain", "build-muscle"]).optional(),
  weeklyRateKg: z.number().min(0).max(1.2).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active"]),
  baselineSteps: z.number().min(0).max(50000).optional(),
  workoutsPerWeek: z.number().int().min(0).max(7).optional(),
  pregnant: z.boolean().optional(),
  eatingDisorderRecovery: z.boolean().optional(),
  medicalConditionPlan: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = recalculateTargetsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid target request." },
      { status: 400 },
    );
  }

  try {
    const targets = calculateDailyTargets(parsed.data);

    return NextResponse.json({ targets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate targets.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
