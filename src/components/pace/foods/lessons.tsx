import {
  Beef,
  CupSoda,
  Droplet,
  ListChecks,
  Salad,
  Sparkles,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { FoodCategory } from "@/lib/nutrition";
import type { NutritionPlan } from "@/lib/state/types";

export type LessonId =
  | "overview"
  | "protein"
  | "carbs"
  | "fats"
  | "fiber"
  | "beverages"
  | "plate"
  | "timing";

export interface LessonDef {
  id: LessonId;
  index: number;
  eyebrow: string;
  shortLabel: string;
  copyKey: keyof NutritionPlan["copy"];
  Icon: LucideIcon;
  /** Highlight approved foods from this catalog category in the lesson body. */
  foodCategory?: FoodCategory;
  /** Render the per-meal plate breakdown (used by lesson 7). */
  showPlate?: boolean;
  /** Render the "today's water" line (used by lesson 6). */
  showWater?: boolean;
  /** Render the daily targets summary (used by lesson 1). */
  showTargets?: boolean;
  /** Render the meal-timing strip (used by lesson 8). */
  showTiming?: boolean;
}

export const lessons: LessonDef[] = [
  {
    id: "overview",
    index: 0,
    eyebrow: "Lesson 1 of 8 · Why this works",
    shortLabel: "Why",
    copyKey: "overview",
    Icon: Sparkles,
    showTargets: true,
  },
  {
    id: "protein",
    index: 1,
    eyebrow: "Lesson 2 of 8 · Protein",
    shortLabel: "Protein",
    copyKey: "protein",
    Icon: Beef,
    foodCategory: "proteins",
  },
  {
    id: "carbs",
    index: 2,
    eyebrow: "Lesson 3 of 8 · Carbs",
    shortLabel: "Carbs",
    copyKey: "carbs",
    Icon: Wheat,
    foodCategory: "carbs",
  },
  {
    id: "fats",
    index: 3,
    eyebrow: "Lesson 4 of 8 · Fats",
    shortLabel: "Fats",
    copyKey: "fats",
    Icon: Droplet,
    foodCategory: "fats",
  },
  {
    id: "fiber",
    index: 4,
    eyebrow: "Lesson 5 of 8 · Fiber & veg",
    shortLabel: "Fiber",
    copyKey: "fiber",
    Icon: Salad,
    foodCategory: "fiber",
  },
  {
    id: "beverages",
    index: 5,
    eyebrow: "Lesson 6 of 8 · Beverages",
    shortLabel: "Beverages",
    copyKey: "beverages",
    Icon: CupSoda,
    showWater: true,
  },
  {
    id: "plate",
    index: 6,
    eyebrow: "Lesson 7 of 8 · Plate it",
    shortLabel: "Plate",
    copyKey: "plate",
    Icon: Utensils,
    showPlate: true,
  },
  {
    id: "timing",
    index: 7,
    eyebrow: "Lesson 8 of 8 · Time it",
    shortLabel: "Timing",
    copyKey: "timing",
    Icon: ListChecks,
    showTiming: true,
  },
];

export const lessonsById: Record<LessonId, LessonDef> = lessons.reduce(
  (acc, lesson) => {
    acc[lesson.id] = lesson;
    return acc;
  },
  {} as Record<LessonId, LessonDef>,
);

export function lessonAt(index: number): LessonDef | undefined {
  return lessons[index];
}
