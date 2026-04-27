"use client";

import { useCallback, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useEntitlement } from "@/lib/entitlement";
import { suggestRecipes, type MealSlot } from "@/lib/meal-plan";
import type { DietaryPref } from "@/lib/state/types";
import { Button, SectionHeader, Skeleton } from "../primitives";
import { PaywallSheet } from "../paywall-sheet";
import { RecipeCard, type RecipeView } from "./recipe-card";

export function RecipeIdeas({
  slot,
  approvedFoods,
  prefs,
}: {
  slot: MealSlot;
  approvedFoods: string[];
  prefs: DietaryPref[];
}) {
  const verdict = useEntitlement("nutrition-guide");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [aiResults, setAiResults] = useState<RecipeView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const curated = suggestRecipes(approvedFoods, prefs, slot, 3).map(
    (m): RecipeView => ({
      name: m.name,
      parts: m.parts,
      calories: m.calories,
      proteinG: m.proteinG,
      tags: m.tags,
    }),
  );

  const generate = useCallback(async () => {
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/recipe-ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: slot.id,
          approvedFoods,
          dietaryPreferences: prefs,
          slotTargets: {
            calories: slot.calorieTarget,
            proteinG: slot.proteinG,
            carbsG: slot.carbsG,
            fatG: slot.fatG,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Could not generate recipes.");
      }
      const data = (await res.json()) as {
        ideas: { recipes: RecipeView[] };
      };
      setAiResults(data.ideas.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate recipes.");
    } finally {
      setLoading(false);
    }
  }, [verdict.allowed, slot, approvedFoods, prefs]);

  return (
    <section className="mt-4">
      <SectionHeader eyebrow="Inspiration" title="Recipe ideas" />
      {curated.length === 0 ? (
        <p className="text-sm text-muted">
          Add a few proteins and carbs to your list to unlock recipe ideas for
          this slot.
        </p>
      ) : (
        <ul className="space-y-3">
          {curated.map((r) => (
            <li key={r.name}>
              <RecipeCard recipe={r} />
            </li>
          ))}
        </ul>
      )}

      {aiResults && aiResults.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.18em] text-forest">
            <Sparkles size={12} aria-hidden /> Fresh ideas
          </p>
          <ul className="space-y-3">
            {aiResults.map((r) => (
              <li key={r.name}>
                <RecipeCard recipe={r} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <ul className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-24 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}

      <Button
        variant="secondary"
        fullWidth
        className="mt-4"
        onClick={generate}
        disabled={loading}
      >
        {verdict.allowed ? (
          <>
            <Sparkles size={16} aria-hidden />{" "}
            {aiResults ? "Generate again" : "Generate fresh ideas"}
          </>
        ) : (
          <>
            <Lock size={16} aria-hidden /> Generate fresh ideas
          </>
        )}
      </Button>

      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="nutrition-guide"
      />
    </section>
  );
}
