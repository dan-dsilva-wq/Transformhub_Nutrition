// Bump BUILD_TAG to verify a fresh deploy is live. The auth screen
// footer renders "build <BUILD_TAG>" so you can confirm at a glance.
// NEXT_PUBLIC_BUILD_SHA is injected at build time by next.config.ts
// from VERCEL_GIT_COMMIT_SHA — useful for cross-checking the exact commit.

export const BUILD_TAG = "v3";

export const BUILD_SHA = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);

export const BUILD_LABEL = `build ${BUILD_TAG} · ${BUILD_SHA}`;
