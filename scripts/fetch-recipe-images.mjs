#!/usr/bin/env node
/**
 * Populate src/components/pace/foods/recipe-images.json with one curated
 * Unsplash photo per recipe key.
 *
 * Usage:
 *   1. Get a free Unsplash dev key at https://unsplash.com/developers (Demo tier
 *      = 50 search requests / hour, plenty for 175 recipes over a few hours).
 *   2. Set the env var and run:
 *        UNSPLASH_ACCESS_KEY=xxxxxxxx node scripts/fetch-recipe-images.mjs
 *   3. Pass --refresh <key> to re-fetch a single recipe, or --all to wipe and
 *      refetch everything.
 *
 * The script:
 *   - Reads recipes from src/components/pace/foods/food-data.ts (regex parse,
 *     no TypeScript runtime needed).
 *   - Skips any key that already has an entry in recipe-images.json (idempotent).
 *   - Searches Unsplash for "<recipe name> food" and picks the top result.
 *   - Stores the photo id, a CDN url at w=800, the blurHash translated to a
 *     base64 LQIP, photographer name + profile url for attribution.
 *   - Pauses ~1.3s between requests to stay well under 50 req/hr.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RECIPE_FILE = path.join(ROOT, "src/components/pace/foods/food-data.ts");
const OUT_FILE = path.join(ROOT, "src/components/pace/foods/recipe-images.json");

const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) {
  console.error("Missing UNSPLASH_ACCESS_KEY env var.");
  console.error("Get one free at https://unsplash.com/developers");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const refreshAll = args.has("--all");
const refreshIdx = process.argv.indexOf("--refresh");
const refreshOne = refreshIdx >= 0 ? process.argv[refreshIdx + 1] : null;

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

async function searchUnsplash(query) {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "5");
  url.searchParams.set("orientation", "squarish");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${KEY}`,
      "Accept-Version": "v1",
    },
  });
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    throw new Error(`Rate-limited (remaining=${remaining}). Wait an hour and resume.`);
  }
  if (!res.ok) {
    throw new Error(`Unsplash ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.results ?? [];
}

function pickPhoto(results) {
  if (!results.length) return null;
  // Prefer ones with food-y descriptions; fall back to first.
  const foodish = results.find((r) => {
    const text = `${r.alt_description ?? ""} ${r.description ?? ""}`.toLowerCase();
    return /food|dish|meal|plate|bowl|cooked|recipe|cuisine|breakfast|lunch|dinner/.test(text);
  });
  return foodish ?? results[0];
}

function toEntry(photo) {
  const url = `${photo.urls.raw}&w=800&q=80&auto=format&fit=crop`;
  return {
    id: photo.id,
    url,
    blur: photo.blur_hash ?? "",
    by: photo.user?.name ?? "",
    byUrl: photo.user?.links?.html ?? "",
  };
}

async function main() {
  const keys = loadRecipeKeys();
  const existing = refreshAll ? {} : loadExisting();
  console.log(`Loaded ${keys.length} recipes. ${Object.keys(existing).length} already have images.`);

  const todo = refreshOne
    ? [refreshOne]
    : keys.filter((k) => !existing[k]);
  console.log(`Will fetch ${todo.length} photo(s).`);

  let i = 0;
  for (const key of todo) {
    i += 1;
    const query = `${key} food`;
    process.stdout.write(`[${i}/${todo.length}] ${key} ... `);
    try {
      const results = await searchUnsplash(query);
      const photo = pickPhoto(results);
      if (!photo) {
        console.log("no result");
        continue;
      }
      existing[key] = toEntry(photo);
      console.log(`${photo.id} (by ${photo.user?.name ?? "?"})`);
      // Save after every fetch so a crash doesn't lose progress.
      saveExisting(existing);
    } catch (err) {
      console.log("\n" + err.message);
      if (String(err.message).includes("Rate-limited")) {
        saveExisting(existing);
        process.exit(2);
      }
    }
    // ~1.3s between requests = comfortably under 50/hr.
    await new Promise((r) => setTimeout(r, 1300));
  }

  saveExisting(existing);
  console.log(`Done. ${Object.keys(existing).length}/${keys.length} recipes have images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
