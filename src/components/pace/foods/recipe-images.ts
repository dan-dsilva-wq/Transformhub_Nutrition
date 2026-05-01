import imagesJson from "./recipe-images.json";
import type { RecipeImage } from "./food-data";

const images = imagesJson as Record<string, RecipeImage>;

export function recipeImage(key: string): RecipeImage | null {
  return images[key] ?? null;
}
