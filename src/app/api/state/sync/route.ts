import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SyncMeal {
  id: string;
  name: string;
  loggedAt: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  imageUrl?: string | null;
  confidence?: number | null;
}

interface SyncWeight {
  isoDate?: string;
  date?: string;
  weightKg: number;
}

interface SyncCheckIn {
  id: string;
  isoDate?: string;
  date?: string;
  note: string;
  energy?: number;
  hunger?: number;
}

interface SyncBody {
  profile?: {
    age: number;
    sexForCalories: "female" | "male";
    heightCm: number;
    currentWeightKg: number;
    goalWeightKg: number;
    activityLevel: "sedentary" | "light" | "moderate" | "active";
    baselineSteps?: number;
    workoutsPerWeek?: number;
    goalIntent?: string;
    weeklyRateKg?: number;
  };
  targets?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    waterMl: number;
    steps: number;
    workoutsPerWeek: number;
    exerciseMinutesPerWeek: number;
  };
  meals?: SyncMeal[];
  weights?: SyncWeight[];
  checkIns?: SyncCheckIn[];
  hasOnboarded?: boolean;
  onboardingExtras?: { name?: string };
}

function isoDay(value: string | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function numeric(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uuidOrNull(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export async function POST(request: Request) {
  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json({ error: "Sync unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  await admin.from("testers").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      last_seen_at: now,
      onboarding_completed_at: body.hasOnboarded ? now : undefined,
      user_agent: userAgent,
    },
    { onConflict: "id" },
  );

  if (body.profile) {
    const profile = body.profile;
    await admin.from("profiles").upsert(
      {
        id: user.id,
        age: Math.round(numeric(profile.age, 30)),
        sex_for_calories: profile.sexForCalories,
        units: "metric",
        height_cm: numeric(profile.heightCm, 170),
        current_weight_kg: numeric(profile.currentWeightKg, 80),
        goal_weight_kg: numeric(profile.goalWeightKg, 72),
        activity_level: profile.activityLevel,
        schedule: {
          name: body.onboardingExtras?.name ?? null,
          baselineSteps: profile.baselineSteps ?? null,
          workoutsPerWeek: profile.workoutsPerWeek ?? null,
          goalIntent: profile.goalIntent ?? null,
          weeklyRateKg: profile.weeklyRateKg ?? null,
        },
        adult_guardrail_accepted: true,
        updated_at: now,
      },
      { onConflict: "id" },
    );
  }

  if (body.targets) {
    const targets = body.targets;
    await admin.from("daily_targets").upsert(
      {
        user_id: user.id,
        target_date: new Date().toISOString().slice(0, 10),
        calories: Math.round(numeric(targets.calories)),
        protein_g: Math.round(numeric(targets.proteinG)),
        carbs_g: Math.round(numeric(targets.carbsG)),
        fat_g: Math.round(numeric(targets.fatG)),
        fiber_g: Math.round(numeric(targets.fiberG)),
        water_ml: Math.round(numeric(targets.waterMl)),
        steps: Math.round(numeric(targets.steps)),
        workouts_per_week: Math.round(numeric(targets.workoutsPerWeek)),
        exercise_minutes_per_week: Math.round(numeric(targets.exerciseMinutesPerWeek)),
        source: "app_sync",
      },
      { onConflict: "user_id,target_date" },
    );
  }

  const meals = (body.meals ?? []).slice(0, 500);
  await admin.from("meal_items").delete().eq("user_id", user.id);
  await admin.from("meal_logs").delete().eq("user_id", user.id);
  const mealRows = meals
    .map((meal) => ({ meal, id: uuidOrNull(meal.id) }))
    .filter((entry): entry is { meal: SyncMeal; id: string } => Boolean(entry.id))
    .map(({ meal, id }) => ({
      id,
      user_id: user.id,
      logged_at: meal.loggedAt,
      meal_name: meal.name.slice(0, 200),
      photo_path: meal.imageUrl ?? null,
      status: "confirmed",
      ai_confidence: meal.confidence ?? null,
      source: meal.imageUrl ? "photo_ai" : "manual",
    }));
  if (mealRows.length) {
    await admin.from("meal_logs").insert(mealRows);
    await admin.from("meal_items").insert(
      meals
        .map((meal) => ({ meal, mealLogId: uuidOrNull(meal.id) }))
        .filter((entry): entry is { meal: SyncMeal; mealLogId: string } => Boolean(entry.mealLogId))
        .map(({ meal, mealLogId }) => ({
          meal_log_id: mealLogId,
          user_id: user.id,
          name: meal.name.slice(0, 200),
          portion: "Logged meal",
          calories: Math.round(numeric(meal.calories)),
          protein_g: numeric(meal.proteinG),
          carbs_g: numeric(meal.carbsG),
          fat_g: numeric(meal.fatG),
          fiber_g: numeric(meal.fiberG),
          confidence: meal.confidence ?? null,
        })),
    );
  }

  const weights = (body.weights ?? []).slice(0, 500);
  if (weights.length) {
    await admin.from("weight_logs").upsert(
      weights.map((entry) => ({
        user_id: user.id,
        log_date: isoDay(entry.isoDate ?? entry.date),
        weight_kg: numeric(entry.weightKg),
      })),
      { onConflict: "user_id,log_date" },
    );
  }

  const checkIns = (body.checkIns ?? []).slice(0, 500);
  await admin.from("progress_entries").delete().eq("user_id", user.id);
  if (checkIns.length) {
    await admin.from("progress_entries").insert(
      checkIns.map((entry) => ({
        id: uuidOrNull(entry.id) ?? undefined,
        user_id: user.id,
        entry_date: isoDay(entry.isoDate ?? entry.date),
        mood:
          typeof entry.energy === "number" || typeof entry.hunger === "number"
            ? `Energy ${entry.energy ?? "-"} / Hunger ${entry.hunger ?? "-"}`
            : null,
        wins: entry.note?.slice(0, 1000) ?? null,
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    synced: {
      meals: mealRows.length,
      weights: weights.length,
      checkIns: checkIns.length,
    },
  });
}
