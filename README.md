# Transform Hub — Performance Nutrition

Engineered nutrition tracking for high performers. A mobile-first PWA that pairs photo-based meal estimates with daily targets, water and step accountability, progress tracking, a tailored food guide, a home-workout plan, and an AI coach.

This is the Transform Hub white-labelled build — the original Pace codebase rebranded around the Transform Hub palette (`#003c53` navy, `#008fd0` cyan, `#020202` ink, `#ffffff` paper) and brand mark. Brand assets live in `public/brand/`.

## Setup

If you copied this folder, run `npm install` here — the project uses an isolated `node_modules` per copy.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase auth/database/storage with RLS migration in `supabase/migrations`
- OpenAI Responses API for meal photo estimates and coach replies
- Vitest unit tests and Playwright mobile E2E tests

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these for real backend/AI behavior:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
FDC_API_KEY=DEMO_KEY
NEXT_ALLOWED_DEV_ORIGINS=
CAPACITOR_SERVER_URL=
```

Without API keys, the UI still runs with demo data and a demo estimate fallback so the full flow can be tested locally. With Supabase env vars set, the app shows an auth gate and persists user-owned data.

## Auth

The app supports:

- Email/password sign in and sign up
- Google OAuth via Supabase

For Google login, enable Google as a provider in Supabase Auth and add this redirect URL:

```bash
http://localhost:3000/auth/callback
https://pace-nutrition.vercel.app/auth/callback
```

If you run the dev server on another port, add that callback URL too.

## Supabase

Apply `supabase/migrations/001_initial_schema.sql` to create:

- User-owned profile, goal, meal, hydration, step, weight, progress, workout, coach, and device import tables
- Row-level security policies on every user-owned table
- Private `meal-photos` and `progress-photos` buckets scoped by user folder

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

## Android App Shell

The repo includes a Capacitor Android shell in [android](./android). This app is configured to load the deployed Pace site from `CAPACITOR_SERVER_URL`, which is the safest fit for the current Next.js setup because the app still depends on server routes such as `/api/ai/meal-estimate`, `/api/food/barcode`, and `/auth/callback`.

Practical release flow:

```bash
# 1. deploy Pace to a real https domain
CAPACITOR_SERVER_URL=https://your-deployed-domain.example

# 2. sync the native shell
npm run cap:sync

# 3. open Android Studio
npm run cap:open:android
```

Notes:

- The fallback web assets for Capacitor live in `capacitor-web/index.html`. They only exist so Capacitor can sync cleanly.
- Live barcode scanning on a phone needs a secure context. In the native Android shell that should come from Capacitor's local secure host instead of `http://192.168...`.
- This machine still needs Java and Android Studio installed before you can build a signed `.aab` for Google Play.

## Google Play

Once Android Studio is installed and the app is pointing at your deployed `https` URL:

1. Open [android](./android) in Android Studio.
2. Let Gradle finish syncing.
3. Review the local-only signing files in `android/local.properties` and `android/keystore.properties`.
4. Build a release App Bundle (`.aab`) from Android Studio.
5. Upload that bundle to Google Play Console with your privacy policy and store listing.

The repo now supports a local `android/keystore.properties` file for release signing. If that file is present, the Android `release` build automatically signs with it. Keep that file and the keystore itself out of version control.

## Safety Positioning

The app is adults-only and provides general wellness coaching. It does not provide medical diagnosis, medical nutrition therapy, pregnancy guidance, or eating disorder recovery guidance.
