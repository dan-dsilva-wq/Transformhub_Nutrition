"use client";

import { useEffect, useState } from "react";
import { Activity, Apple as AppleIcon, RefreshCw, Watch } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import {
  HealthConnect,
  isHealthConnectPlatform,
} from "@/lib/health/health-connect";
import { Button, Card, IconBadge, SectionHeader } from "./primitives";
import { LockedState } from "./paywall-sheet";

type HealthStatus = "checking" | "unsupported" | "available" | "connected";

interface Integration {
  id: string;
  name: string;
  body: string;
  status: "connected" | "available" | "coming-soon";
  icon: React.ReactNode;
  tone: "forest" | "sage" | "amber";
  action?: React.ReactNode;
}

export function IntegrationsScreen() {
  const { steps, actions } = useAppState();
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!isHealthConnectPlatform()) {
        if (!cancelled) setHealthStatus("unsupported");
        return;
      }
      try {
        const { available } = await HealthConnect.isAvailable();
        if (!available) {
          if (!cancelled) setHealthStatus("unsupported");
          return;
        }
        const { granted } = await HealthConnect.hasPermissions();
        if (cancelled) return;
        setHealthStatus(granted ? "connected" : "available");
      } catch {
        if (!cancelled) setHealthStatus("unsupported");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncOnce() {
    setBusy(true);
    setError(null);
    try {
      const { steps: stepCount } = await HealthConnect.readStepsToday();
      actions.setSteps(stepCount);
      const { weightKg } = await HealthConnect.readLatestWeight();
      if (typeof weightKg === "number" && weightKg > 0) {
        actions.addWeight(weightKg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { granted } = await HealthConnect.requestHealthPermissions();
      if (granted) {
        setHealthStatus("connected");
        await syncOnce();
      } else {
        setError("Permission denied. Open Health Connect to grant access.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  const healthBody =
    healthStatus === "connected"
      ? `Pulling steps and weight from Health Connect. Today: ${steps.toLocaleString()} steps.`
      : healthStatus === "available"
        ? "Pull steps and weight from Health Connect automatically."
        : healthStatus === "unsupported"
          ? "Available on Android only. Install Health Connect from the Play Store to enable."
          : "Checking availability…";

  const healthAction =
    healthStatus === "connected" ? (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={syncOnce} disabled={busy}>
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden /> Sync now
        </Button>
      </div>
    ) : healthStatus === "available" ? (
      <Button size="sm" variant="secondary" onClick={connect} disabled={busy}>
        {busy ? "Connecting…" : "Connect"}
      </Button>
    ) : healthStatus === "unsupported" ? (
      <span className="text-xs text-muted">Not available on this device</span>
    ) : (
      <span className="text-xs text-muted">Checking…</span>
    );

  const integrations: Integration[] = [
    {
      id: "health",
      name: "Health Connect",
      body: healthBody,
      status:
        healthStatus === "connected"
          ? "connected"
          : healthStatus === "available"
            ? "available"
            : "coming-soon",
      icon: <AppleIcon size={18} aria-hidden />,
      tone: "forest",
      action: healthAction,
    },
    {
      id: "watch",
      name: "Smartwatch",
      body: "Quick log a glass of water or a snack from the wrist.",
      status: "coming-soon",
      icon: <Watch size={18} aria-hidden />,
      tone: "sage",
    },
    {
      id: "activity",
      name: "Strava",
      body: "Read activity minutes and adjust the calorie buffer on big days.",
      status: "coming-soon",
      icon: <Activity size={18} aria-hidden />,
      tone: "amber",
    },
  ];

  return (
    <LockedState feature="integrations-sync">
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · INTEGRATIONS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Pull in <span className="text-forest">what counts.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Less typing, more living. Connect what you already wear.
        </p>
      </header>

      <section>
        <SectionHeader eyebrow="Available" title="Connect a source" />
        {error ? (
          <Card className="!p-3 mb-3 border border-clay/40 bg-clay/5">
            <p className="text-xs text-clay">{error}</p>
          </Card>
        ) : null}
        <ul className="space-y-3">
          {integrations.map((i) => (
            <li key={i.id}>
              <Card className="!p-4">
                <div className="flex items-start gap-3">
                  <IconBadge tone={i.tone}>{i.icon}</IconBadge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg text-ink-2">{i.name}</h3>
                      <StatusPill status={i.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{i.body}</p>
                  </div>
                </div>
                <div className="mt-3">
                  {i.action ?? (
                    i.status === "available" ? (
                      <Button size="sm" variant="secondary">Connect</Button>
                    ) : i.status === "connected" ? (
                      <Button size="sm" variant="ghost">Disconnect</Button>
                    ) : (
                      <span className="text-xs text-muted">In testing</span>
                    )
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </LockedState>
  );
}

function StatusPill({ status }: { status: Integration["status"] }) {
  const map: Record<Integration["status"], { label: string; cls: string }> = {
    connected: { label: "Connected", cls: "bg-forest text-white" },
    available: { label: "Available", cls: "bg-sage/15 text-sage" },
    "coming-soon": { label: "Soon", cls: "border border-white/70 bg-white/70 text-muted backdrop-blur" },
  };
  const m = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${m.cls}`}>
      {m.label}
    </span>
  );
}
