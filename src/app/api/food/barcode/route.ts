import { NextResponse } from "next/server";
import { z } from "zod";
import { normaliseOpenFoodFactsProduct } from "@/lib/barcode-product";

export const runtime = "nodejs";

const barcodeSchema = z.string().trim().regex(/^[0-9]{6,18}$/, "Enter a valid 6-18 digit barcode.");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsed = barcodeSchema.safeParse(requestUrl.searchParams.get("code") ?? "");

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid barcode." }, { status: 400 });
  }

  const code = parsed.data;
  const fields = [
    "code",
    "product_name",
    "generic_name",
    "brands",
    "quantity",
    "serving_size",
    "serving_quantity",
    "image_front_url",
    "image_url",
    "nutriments",
  ].join(",");
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${encodeURIComponent(fields)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Pace/0.1.0 (local beta)",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Barcode lookup is unavailable right now." }, { status: 502 });
    }

    const product = normaliseOpenFoodFactsProduct(await response.json(), code);

    if (!product) {
      return NextResponse.json({ error: "No product found for that barcode." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Could not look up that barcode." }, { status: 502 });
  }
}
