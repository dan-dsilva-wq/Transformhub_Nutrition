# Pace Google Play Release Checklist

Last checked: 29 April 2026

## Build To Upload

- App name: Pace
- Package name: `com.danieldsilva.pace`
- Version code: `2`
- Version name: `1.1`
- Target SDK: `36`
- Production web URL used by Capacitor: `https://pace-nutrition.vercel.app`
- Privacy policy URL: `https://pace-nutrition.vercel.app/privacypolicy.html`
- Release bundle: `android/app/build/outputs/bundle/release/app-release.aab`

## Release Manifest Permissions

Current release permissions:

- `android.permission.CAMERA`
- `android.permission.INTERNET`
- `android.permission.health.READ_STEPS`
- `android.permission.health.READ_WEIGHT`

## Health Connect Declaration (required for v1.1)

Re-introducing Health Connect read access in version code 2. Before submitting to a production track:

1. Play Console → **App content → Health Connect declaration** → fill the questionnaire:
   - Data types accessed: **Steps (read), Weight (read)**.
   - Purpose: "Display the user's daily step total on the home screen and populate their weight history when newer readings are available." Tie it to the Integrations screen.
   - Link the privacy policy URL above; the policy already includes a Health Connect-specific section.
2. Confirm the rationale flow works:
   - On Android 13 or earlier: tap "Privacy policy" inside Health Connect → opens browser to `/privacypolicy.html` (handled by `PrivacyPolicyActivity`).
   - On Android 14+: same flow via `VIEW_PERMISSION_USAGE` on `MainActivity`.
3. The first production review with the new permissions typically takes several days. Plan accordingly.

## Play Console Data Safety Draft

Use this as a starting point in Play Console. Final answers must match the production behavior and any provider settings.

### Data Collected

- Personal info: email address, name/profile inputs if the user enters them.
- User IDs: Supabase user ID and authentication/session identifiers.
- Health and fitness: weight entries, goals, food/nutrition logs, water, steps entered by the user, workout preferences.
- Photos and videos: meal photos and progress photos selected by the user.
- App activity / user-generated content: coach messages, meal notes, food searches, barcode lookups, nutrition plan preferences.
- Device or other identifiers: may be processed by hosting/auth infrastructure for security, logs, and app operations.

### Data Shared / Processed By Service Providers

- Supabase: authentication, database, storage.
- OpenAI: AI meal estimates, coach replies, nutrition plan copy, recipe ideas.
- Vercel: hosting and serverless function runtime/logging.
- USDA FoodData Central and Open Food Facts: food search and barcode/product nutrition lookups.
- Google OAuth/Supabase Auth: Google sign-in, if enabled.

### Security And Control

- Mark data as encrypted in transit: yes, production uses HTTPS.
- Account creation: yes.
- Account deletion: in-app deletion is available from Settings, with `/account/delete` as a web fallback.
- Data sale: no.
- Optional permissions: camera is feature-triggered.

## App Access For Review

The app requires sign-in when Supabase is configured. In Play Console, fill **App access** with either:

- A dedicated reviewer account and password, or
- Clear instructions for creating a test account and confirming email.

Do not commit reviewer credentials to this repository.

## Content And Policy Positioning

- Target audience: adults only.
- Category: Health & Fitness.
- Medical claims: avoid diagnosis, treatment, pregnancy guidance, eating disorder recovery, or medical nutrition therapy claims.
- Store listing should describe general wellness/nutrition tracking and AI-assisted estimates, not medical advice.
- Complete the Data safety form before closed/open/production testing.
- Complete content rating questionnaire.
- Enroll in Play App Signing and upload the signed `.aab`.

## Final Pre-Upload Checks

Run these from the repo root:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
cd android
.\gradlew.bat clean :app:bundleRelease --console=plain
```

After any web deploy, verify:

- `https://pace-nutrition.vercel.app` returns `200`.
- `https://pace-nutrition.vercel.app/privacypolicy.html` returns `200`.
- `POST https://pace-nutrition.vercel.app/api/ai/coach` without a signed-in session returns `401`.
