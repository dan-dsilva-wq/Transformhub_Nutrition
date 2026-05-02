"use client";

import { Activity, Refrigerator, Watch } from "lucide-react";
import { Card, IconBadge, SectionHeader } from "./primitives";
import { LockedState } from "./paywall-sheet";

interface Integration {
  id: string;
  name: string;
  body: string;
  status: "connected" | "available" | "coming-soon";
  icon: React.ReactNode;
  tone: "forest" | "sage" | "amber";
}

export function IntegrationsScreen() {
  const integrations: Integration[] = [
    {
      id: "pantry",
      name: "Smart pantry",
      body: "Scan a barcode to add items, then we'll suggest recipes that use what's about to expire.",
      status: "coming-soon",
      icon: <Refrigerator size={18} aria-hidden />,
      tone: "forest",
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
      name: "Calendar",
      body: "Pull tomorrow's schedule so meal reminders land in the gaps, not in meetings.",
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
            Less typing, more living. Connect what you already wear — coming soon.
          </p>
        </header>

        <section>
          <SectionHeader eyebrow="Roadmap" title="In the works" />
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
                    <span className="text-xs text-muted">In testing</span>
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
    "coming-soon": {
      label: "Soon",
      cls: "border border-white/70 bg-white/70 text-muted backdrop-blur",
    },
  };
  const m = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
