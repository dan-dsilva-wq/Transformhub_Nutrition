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
    const match = line.match(/^([^=]+)=(.*)$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2];
  }
}

loadDotEnvFile(".env.local");

function normaliseUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}

const serverUrl = normaliseUrl(process.env.CAPACITOR_SERVER_URL);
const allowNavigation = serverUrl ? [new URL(serverUrl).host] : undefined;

const config: CapacitorConfig = {
  appId: "com.danieldsilva.pace",
  appName: "Pace",
  webDir: "capacitor-web",
  backgroundColor: "#fbfaf6",
  server: serverUrl
    ? {
        url: serverUrl,
        androidScheme: "https",
        cleartext: false,
        allowNavigation,
      }
    : undefined,
  android: {
    backgroundColor: "#fbfaf6",
  },
};

export default config;
