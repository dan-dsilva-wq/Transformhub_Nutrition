"use client";

import { Card } from "../primitives";

export interface RecipeView {
  name: string;
  parts: string[];
  calories: number;
  proteinG: number;
  tags: string[];
}

export function RecipeCard({ recipe }: { recipe: RecipeView }) {
  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-ink-2">{recipe.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {recipe.parts.join(" · ")}
          </p>
          {recipe.tags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {recipe.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-white/70 bg-white/70 px-2.5 py-0.5 text-[11px] text-muted backdrop-blur"
                >
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="text-right">
          <div className="numerals text-lg text-ink-2">{recipe.calories}</div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
            {recipe.proteinG}g P
          </div>
        </div>
      </div>
    </Card>
  );
}
