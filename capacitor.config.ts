import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    const value = match[2].replace(/^["']|["']$/g, "");
    process.env[match[1]] = value;
  }
}

loadDotEnvFile(".env.local");

/**
 * Canonical production URL the installed Android app must load from. This is
 * the source of truth — the `.env.local` override below is only for pointing
 * the WebView at a different host during local development. If you ever need
 * to migrate to a new production domain, change this constant **and** the
 * value listed in `.env.example`, otherwise installed apps in the wild will
 * keep loading from the old host.
 */
const PRODUCTION_SERVER_URL = "https://pace-nutrition.vercel.app";

/**
 * Other production URLs that should be treated as valid. Anything not on this
 * list (typically a forgotten preview or old project URL) triggers a loud
 * warning at sync time so we don't silently ship a stale build.
 */
const KNOWN_PRODUCTION_HOSTS = new Set<string>([
  "pace-nutrition.vercel.app",
]);

function normaliseUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}

function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.startsWith("127.") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.endsWith(".local")
  );
}

const envUrl = normaliseUrl(process.env.CAPACITOR_SERVER_URL);
const serverUrl = envUrl ?? PRODUCTION_SERVER_URL;
const serverHost = new URL(serverUrl).host;

if (!KNOWN_PRODUCTION_HOSTS.has(serverHost) && !isLocalHost(serverHost)) {
  // Print a noisy warning so a typo or stale .env.local can't quietly point
  // a release build at a dead/old Vercel project — that exact mistake cost
  // us a debugging session before this guard existed.
  console.warn(
    `\n⚠️  Capacitor server URL "${serverUrl}" is not in KNOWN_PRODUCTION_HOSTS ` +
      `(${[...KNOWN_PRODUCTION_HOSTS].join(", ")}).\n` +
      `   If you are NOT building a local dev override, fix CAPACITOR_SERVER_URL ` +
      `in .env.local or update KNOWN_PRODUCTION_HOSTS in capacitor.config.ts.\n`,
  );
}

console.log(`[capacitor.config] WebView will load: ${serverUrl}`);

const allowNavigation = [serverHost];

const config: CapacitorConfig = {
  appId: "com.transformhub.app",
  appName: "Transform Hub",
  webDir: "capacitor-web",
  backgroundColor: "#001a26",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: false,
    allowNavigation,
  },
  android: {
    backgroundColor: "#001a26",
  },
};

export default config;
