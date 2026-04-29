import { Capacitor, registerPlugin } from "@capacitor/core";

interface HealthConnectPlugin {
  isAvailable(): Promise<{ available: boolean; status: string }>;
  hasPermissions(): Promise<{ granted: boolean }>;
  requestHealthPermissions(): Promise<{ granted: boolean }>;
  readStepsToday(): Promise<{ steps: number }>;
  readLatestWeight(): Promise<{ weightKg: number | null; recordedAt?: string }>;
}

const native = registerPlugin<HealthConnectPlugin>("HealthConnect", {
  web: {
    isAvailable: async () => ({ available: false, status: "web" }),
    hasPermissions: async () => ({ granted: false }),
    requestHealthPermissions: async () => ({ granted: false }),
    readStepsToday: async () => ({ steps: 0 }),
    readLatestWeight: async () => ({ weightKg: null }),
  },
});

export function isHealthConnectPlatform(): boolean {
  return Capacitor.getPlatform() === "android";
}

export const HealthConnect = native;
