#!/usr/bin/env node
/**
 * Populate src/components/pace/foods/recipe-images.json + public/recipes/*.jpg
 * with one cover photo per recipe key.
 *
 * Sources, in priority order:
 *   1. TheMealDB free API — recipe-specific photos for ~300 known dishes.
 *      No key required.
 *   2. Pexels — high-quality CC0 photo search. Instant free key from
 *      https://www.pexels.com/api/. Set PEXELS_API_KEY env var.
 *
 * Photos are downloaded to public/recipes/ so the live app never depends on
 * third-party uptime.
 *
 * Usage:
 *   PEXELS_API_KEY=xxx node scripts/fetch-recipe-images.mjs
 *
 *   --refresh "Recipe name"   refetch a single key
 *   --all                     wipe and refetch everything
 *   --replace-foodish         replace any leftover Foodish entries (from older
 *                             runs) with Pexels results
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RECIPE_FILE = path.join(ROOT, "src/components/pace/foods/food-data.ts");
const OUT_FILE = path.join(ROOT, "src/components/pace/foods/recipe-images.json");
const PHOTO_DIR = path.join(ROOT, "public/recipes");

const PEXELS_KEY = process.env.PEXELS_API_KEY || "";

const args = process.argv.slice(2);
const argSet = new Set(args);
const refreshAll = argSet.has("--all");
const replaceFoodish = argSet.has("--replace-foodish");
const refreshIdx = args.indexOf("--refresh");
const refreshOne = refreshIdx >= 0 ? args[refreshIdx + 1] : null;
const queryIdx = args.indexOf("--query");
const queryOverride = queryIdx >= 0 ? args[queryIdx + 1] : null;
const skipIdx = args.indexOf("--skip");
const skipPhotoId = skipIdx >= 0 ? args[skipIdx + 1] : null;

if (!PEXELS_KEY && !refreshOne) {
  console.error("PEXELS_API_KEY env var not set.");
  console.error("Get one at https://www.pexels.com/api/ (instant, free).");
  console.error("Then run:  PEXELS_API_KEY=<key> node scripts/fetch-recipe-images.mjs");
  process.exit(1);
}

function loadRecipeKeys() {
  const src = fs.readFileSync(RECIPE_FILE, "utf8");
  const start = src.indexOf("export const recipes:");
  if (start < 0) throw new Error("Could not find `export const recipes:` in food-data.ts");
  const block = src.slice(start);
  const matches = [...block.matchAll(/^\s\s"([^"]+)":\s*\{/gm)];
  return [...new Set(matches.map((m) => m[1]))];
}

function loadExisting() {
  if (!fs.existsSync(OUT_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveExisting(data) {
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------- TheMealDB ---------- */

function tokens(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["the", "and", "with", "plus"].includes(t));
}

async function searchMealDB(query) {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.meals ?? [];
}

function bestMealMatch(name, meals) {
  if (!meals.length) return null;
  const want = new Set(tokens(name));
  let best = null;
  let bestScore = 0;
  for (const m of meals) {
    const got = new Set(tokens(m.strMeal));
    let score = 0;
    for (const w of want) if (got.has(w)) score += 2;
    for (const g of got) if (!want.has(g)) score -= 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return bestScore >= 2 ? best : null;
}

async function tryMealDB(name) {
  const queries = [name];
  const ts = tokens(name);
  if (ts.length >= 2) queries.push(ts.slice(0, 2).join(" "));
  if (ts.length >= 1) queries.push(ts[0]);

  for (const q of queries) {
    try {
      const meals = await searchMealDB(q);
      const match = bestMealMatch(name, meals);
      if (match?.strMealThumb) {
        return {
          source: "themealdb",
          remoteUrl: match.strMealThumb,
          by: match.strMeal,
          byUrl: `https://www.themealdb.com/meal/${match.idMeal}`,
        };
      }
    } catch {
      /* try next */
    }
    await sleep(300);
  }
  return null;
}

/* ---------- Pexels ---------- */

async function pexelsSearch(query) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "8");
  url.searchParams.set("orientation", "square");
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_KEY },
  });
  if (res.status === 429) {
    throw new Error("Rate-limited by Pexels. Wait an hour and resume.");
  }
  if (!res.ok) {
    throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.photos ?? [];
}

function pickPexelsPhoto(name, photos) {
  if (!photos.length) return null;
  const want = new Set(tokens(name));
  let best = photos[0];
  let bestScore = -Infinity;
  for (const p of photos) {
    const alt = (p.alt ?? "").toLowerCase();
    const got = new Set(tokens(alt));
    let score = 0;
    for (const w of want) if (got.has(w)) score += 3;
    if (/food|dish|meal|plate|bowl|cooked|recipe|cuisine/.test(alt)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

async function tryPexels(name, overrideQuery, skipId) {
  if (!PEXELS_KEY) return null;
  const queries = overrideQuery
    ? [overrideQuery, `${overrideQuery} food`]
    : [`${name} food`, `${name} dish`, `${tokens(name).slice(0, 2).join(" ")} food`];
  for (const q of queries) {
    try {
      const photos = await pexelsSearch(q);
      const filtered = skipId ? photos.filter((p) => String(p.id) !== String(skipId)) : photos;
      const pick = pickPexelsPhoto(name, filtered);
      if (pick) {
        return {
          source: "pexels",
          remoteUrl: pick.src.large || pick.src.medium || pick.src.original,
          by: pick.photographer,
          byUrl: pick.photographer_url || pick.url,
          photoId: pick.id,
        };
      }
    } catch (err) {
      if (String(err.message).includes("Rate-limited")) throw err;
    }
    await sleep(400);
  }
  return null;
}

/* ---------- Download ---------- */

async function downloadTo(remoteUrl, destPath) {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`download ${res.status} for ${remoteUrl}`);
  const ab = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(ab));
}

/* ---------- Main ---------- */

async function main() {
  if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });

  const keys = loadRecipeKeys();
  const existing = refreshAll ? {} : loadExisting();

  if (replaceFoodish) {
    for (const [k, v] of Object.entries(existing)) {
      if (v.source === "foodish") delete existing[k];
    }
  }

  console.log(`Loaded ${keys.length} recipes. ${Object.keys(existing).length} already have images.`);

  const todo = refreshOne ? [refreshOne] : keys.filter((k) => !existing[k]);
  console.log(`Will fetch ${todo.length} photo(s).`);

  let i = 0;
  let mealdbHits = 0;
  let pexelsHits = 0;
  let misses = 0;

  for (const key of todo) {
    i += 1;
    process.stdout.write(`[${i}/${todo.length}] ${key} ... `);

    let pick = queryOverride ? null : await tryMealDB(key);
    if (pick) mealdbHits += 1;
    else {
      try {
        pick = await tryPexels(key, queryOverride, skipPhotoId);
        if (pick) pexelsHits += 1;
      } catch (err) {
        console.log("\n" + err.message);
        saveExisting(existing);
        process.exit(2);
      }
    }

    if (!pick) {
      misses += 1;
      console.log("no result");
      continue;
    }

    const slug = slugify(key);
    // Always save as .jpg — the resize script normalizes everything to .jpg
    // anyway, and this keeps recipe-images.json URLs aligned with the filenames
    // even if Pexels serves a .png.
    const filename = `${slug}.jpg`;
    const destPath = path.join(PHOTO_DIR, filename);

    try {
      await downloadTo(pick.remoteUrl, destPath);
      existing[key] = {
        url: `/recipes/${filename}`,
        source: pick.source,
        by: pick.by,
        byUrl: pick.byUrl,
      };
      saveExisting(existing);
      const idStr = pick.photoId ? ` [id ${pick.photoId}]` : "";
      console.log(`${pick.source} → ${filename}  (${pick.by})${idStr}`);
    } catch (err) {
      console.log(`download failed: ${err.message}`);
    }

    await sleep(250);
  }

  saveExisting(existing);
  console.log("");
  console.log(`Done. ${Object.keys(existing).length}/${keys.length} recipes have images.`);
  console.log(`  TheMealDB: ${mealdbHits}   Pexels: ${pexelsHits}   Misses: ${misses}`);
  if (pexelsHits > 0) {
    console.log("\nNext: run `node scripts/resize-recipe-images.mjs` to compress the new photos.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
