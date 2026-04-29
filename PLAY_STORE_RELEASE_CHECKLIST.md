# Pace Google Play Release Checklist

Last checked: 29 April 2026

## Build To Upload

- App name: Pace
- Package name: `com.danieldsilva.pace`
- Version code: `1`
- Version name: `1.0`
- Target SDK: `36`
- Production web URL used by Capacitor: `https://nutrition-seven-tan.vercel.app`
- Privacy policy URL: `https://nutrition-seven-tan.vercel.app/privacypolicy.html`
- Release bundle: `android/app/build/outputs/bundle/release/app-release.aab`

## Release Manifest Permissions

Current release permissions after removing the unused Health Connect plugin:

- `android.permission.CAMERA`
- `android.permission.INTERNET`
- `android.permission.POST_NOTIFICATIONS`
- `android.permission.RECEIVE_BOOT_COMPLETED`
- `android.permission.WAKE_LOCK`
- `com.leanlens.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

There are no `android.permission.health.*` permissions in the rebuilt release manifest.

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
- Account deletion: provide the support/contact method from the Play listing until an in-app deletion flow is added.
- Data sale: no.
- Optional permissions: camera and notifications are feature-triggered.

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

- `https://nutrition-seven-tan.vercel.app` returns `200`.
- `https://nutrition-seven-tan.vercel.app/privacypolicy.html` returns `200`.
- `POST https://nutrition-seven-tan.vercel.app/api/ai/coach` without a signed-in session returns `401`.
