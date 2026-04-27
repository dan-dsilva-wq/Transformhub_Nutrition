export interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  imageUrl?: string;
  dataQuality: "serving" | "per_100g" | "partial";
  source: "Open Food Facts";
}

interface OpenFoodFactsProductResponse {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    generic_name?: string;
    brands?: string;
    quantity?: string;
    serving_size?: string;
    serving_quantity?: string | number;
    image_front_url?: string;
    image_url?: string;
    nutriments?: Record<string, unknown>;
  };
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function nutrient(nutriments: Record<string, unknown>, key: string, servingQuantity?: number) {
  const serving = numeric(nutriments[`${key}_serving`]);

  if (serving !== undefined) {
    return serving;
  }

  const per100g = numeric(nutriments[`${key}_100g`]);

  if (per100g !== undefined) {
    return servingQuantity ? (per100g * servingQuantity) / 100 : per100g;
  }

  return numeric(nutriments[key]) ?? 0;
}

function calories(nutriments: Record<string, unknown>, servingQuantity?: number) {
  const kcal = nutrient(nutriments, "energy-kcal", servingQuantity);

  if (kcal > 0) {
    return kcal;
  }

  const kj = nutrient(nutriments, "energy-kj", servingQuantity) || nutrient(nutriments, "energy", servingQuantity);
  return kj ? kj / 4.184 : 0;
}

function quality(nutriments: Record<string, unknown>, servingQuantity?: number): BarcodeProduct["dataQuality"] {
  if (numeric(nutriments["energy-kcal_serving"]) !== undefined || numeric(nutriments.proteins_serving) !== undefined) {
    return "serving";
  }

  if (servingQuantity || numeric(nutriments["energy-kcal_100g"]) !== undefined || numeric(nutriments.proteins_100g) !== undefined) {
    return "per_100g";
  }

  return "partial";
}

export function normaliseOpenFoodFactsProduct(
  payload: OpenFoodFactsProductResponse,
  fallbackCode: string,
): BarcodeProduct | null {
  if (payload.status === 0 || !payload.product) {
    return null;
  }

  const product = payload.product;
  const nutriments = product.nutriments ?? {};
  const servingQuantity = numeric(product.serving_quantity);
  const name = product.product_name || product.generic_name || product.brands || `Barcode ${fallbackCode}`;
  const servingSize = product.serving_size || (servingQuantity ? `${servingQuantity} g` : "100 g");

  return {
    code: product.code || fallbackCode,
    name,
    brand: product.brands || undefined,
    servingSize,
    calories: Math.round(calories(nutriments, servingQuantity)),
    proteinG: Number(nutrient(nutriments, "proteins", servingQuantity).toFixed(1)),
    carbsG: Number(nutrient(nutriments, "carbohydrates", servingQuantity).toFixed(1)),
    fatG: Number(nutrient(nutriments, "fat", servingQuantity).toFixed(1)),
    fiberG: Number(nutrient(nutriments, "fiber", servingQuantity).toFixed(1)),
    imageUrl: product.image_front_url || product.image_url || undefined,
    dataQuality: quality(nutriments, servingQuantity),
    source: "Open Food Facts",
  };
}
