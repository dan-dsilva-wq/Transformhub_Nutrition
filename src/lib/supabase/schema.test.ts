import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "001_initial_schema.sql"),
  "utf8",
);

describe("Supabase migration", () => {
  it("enables RLS on every user-owned table", () => {
    const tables = [
      "profiles",
      "goals",
      "daily_targets",
      "meal_logs",
      "meal_items",
      "hydration_logs",
      "step_logs",
      "weight_logs",
      "progress_entries",
      "progress_photos",
      "workout_plans",
      "workout_logs",
      "coach_messages",
      "device_imports",
    ];

    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("keeps meal and progress photos private and user-folder scoped", () => {
    expect(migration).toContain("('meal-photos', 'meal-photos', false");
    expect(migration).toContain("('progress-photos', 'progress-photos', false");
    expect(migration).toContain("auth.uid()::text = (storage.foldername(name))[1]");
  });
});
