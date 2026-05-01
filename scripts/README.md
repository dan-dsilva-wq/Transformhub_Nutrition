# scripts

## fetch-recipe-images.mjs

Populates `src/components/pace/foods/recipe-images.json` with one curated Unsplash photo per recipe key — the cover art shown on every meal puck and recipe sheet.

### One-time setup

1. Sign up for a free dev account at <https://unsplash.com/developers>.
2. Create an app — the **Demo tier** is enough (50 search requests / hour).
3. Copy the **Access Key** (not the Secret Key).

### Run it

```powershell
$env:UNSPLASH_ACCESS_KEY = "your-key"
node scripts/fetch-recipe-images.mjs
```

The script:

- Reads every recipe key from `food-data.ts`.
- Skips any key that already has an entry (idempotent — safe to re-run after adding new recipes).
- Searches Unsplash for `"<recipe name> food"`, picks the most food-relevant top result.
- Stores `id`, CDN url, blur-hash, photographer name + profile url for attribution.
- Saves after every fetch, so a crash or rate-limit interruption won't lose progress.
- Sleeps ~1.3s between requests to stay well under the 50/hr Demo limit.

### Common flags

```powershell
# Refetch a single recipe (e.g. you didn't like the photo it picked):
node scripts/fetch-recipe-images.mjs --refresh "Beef bolognese"

# Wipe and refetch everything from scratch:
node scripts/fetch-recipe-images.mjs --all
```

If you hit the rate limit, the script saves what it has and exits with code 2. Wait an hour and re-run — it'll pick up where it stopped.

### After running

Commit the updated `recipe-images.json`. The app reads it directly at build time — no runtime API calls, no env vars needed at runtime.

### Attribution

Unsplash's free tier requires photographer credit somewhere reachable from the photo. The `by` and `byUrl` fields are stored for this — surface them in a recipe-detail view or a dedicated credits page when convenient.
