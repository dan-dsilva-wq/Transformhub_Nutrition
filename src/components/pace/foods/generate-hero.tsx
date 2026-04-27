"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useEntitlement } from "@/lib/entitlement";
import { useAppState } from "@/lib/state/app-state";
import { Button, Card, IconBadge } from "../primitives";
import { PaywallSheet } from "../paywall-sheet";

export function GenerateHero({ onStart }: { onStart: () => void }) {
  const verdict = useEntitlement("nutrition-guide");
  const { onboardingExtras } = useAppState();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const name = onboardingExtras.name;

  function handleClick() {
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }
    onStart();
  }

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · NUTRITION
        </p>
        <h1 className="font-display mt-2 text-[40px] leading-[1.05] text-ink-2">
          Build your <span className="text-forest">nutrition plan.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          {name ? `${name}, ` : ""}we&apos;ll turn your numbers and food picks
          into a guided 8-lesson plan. About a minute end-to-end.
        </p>
      </header>

      <Card>
        <div className="flex items-start gap-4">
          <IconBadge tone="forest">
            <Sparkles size={16} aria-hidden />
          </IconBadge>
          <div className="min-w-0">
            <h2 className="font-display text-xl text-ink-2">
              Personal, not generic
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your plan walks through protein, carbs, fats, fiber, drinks,
              plating, and timing — using your actual targets and the foods
              you eat.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          <Step n={1} text="Reads your numbers and food list" />
          <Step n={2} text="Writes 8 short lessons in plain language" />
          <Step n={3} text="Saves them so you can re-read any time" />
        </ul>

        <Button
          size="lg"
          fullWidth
          className="mt-6"
          onClick={handleClick}
        >
          {verdict.allowed ? (
            <>
              <Sparkles size={16} aria-hidden /> Generate my plan
            </>
          ) : (
            <>
              <Lock size={16} aria-hidden /> Unlock to generate
            </>
          )}
        </Button>
        {!verdict.allowed ? (
          <p className="mt-2 text-center text-xs text-muted">
            Included in your free 7-day trial.
          </p>
        ) : null}
      </Card>

      <p className="text-xs text-muted">
        We never share your details. Your plan stays on this device.
      </p>

      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="nutrition-guide"
      />
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 backdrop-blur-xl">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-cream text-xs font-medium text-forest">
        {n}
      </span>
      <span className="text-sm text-ink-2">{text}</span>
    </li>
  );
}
