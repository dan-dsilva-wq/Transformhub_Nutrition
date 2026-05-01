# scripts

## fetch-recipe-images.mjs

Populates `src/components/pace/foods/recipe-images.json` and downloads cover photos to `public/recipes/` — one per recipe key. Every meal puck in the foods page reads from that JSON.

### Sources, in priority order

1. **TheMealDB** (free public API, no key) — recipe-specific photos for ~300 named dishes.
2. **Pexels** (free key, instant approval) — high-quality CC0 photo search for everything else.

### One-time setup

1. Sign up at <https://www.pexels.com/api/> (instant, free, no review queue).
2. Copy the API key from your dashboard.

### Run it

```powershell
$env:PEXELS_API_KEY = "your-key"
node scripts/fetch-recipe-images.mjs
```

The script:

- Reads every recipe key from `food-data.ts`.
- Skips any key that already has an entry (idempotent — safe to re-run after adding new recipes).
- For each missing key:
  1. Searches TheMealDB by recipe name and matches the best result by token overlap.
  2. Falls back to Pexels with `"<recipe name> food"` and picks the photo whose alt-text best matches the recipe.
- Downloads the chosen photo to `public/recipes/<slug>.jpg`.
- Saves after every recipe so a crash or rate-limit can resume.

### Common flags

```powershell
# Refetch a single recipe (don't like the photo it picked):
node scripts/fetch-recipe-images.mjs --refresh "Beef bolognese"

# Wipe and refetch everything:
node scripts/fetch-recipe-images.mjs --all

# Replace any leftover Foodish entries from older runs with Pexels results:
node scripts/fetch-recipe-images.mjs --replace-foodish
```

### After running

```powershell
node scripts/resize-recipe-images.mjs
```

This re-encodes everything in `public/recipes/` to ≤800px wide JPEG q=80 with mozjpeg compression. Typically shrinks the directory ~85%.

Then commit `recipe-images.json` and the new files in `public/recipes/`. The app reads them at build time — no runtime API calls, works fully offline.

---

## resize-recipe-images.mjs

Idempotent. Resizes everything in `public/recipes/` to ≤800px wide, JPEG q=80 with mozjpeg compression. Run it once after `fetch-recipe-images.mjs`, or any time you want to recompress.
