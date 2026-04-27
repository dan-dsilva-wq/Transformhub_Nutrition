"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { CoachResponse } from "@/lib/ai/schemas";
import { useAppState, useDayTotals, useTodayMeals } from "@/lib/state/app-state";
import {
  Button,
  Card,
  Field,
  IconBadge,
  Textarea,
} from "./primitives";
import { useEntitlement } from "@/lib/entitlement";
import { PaywallSheet } from "./paywall-sheet";

export function CoachScreen() {
  const {
    profile,
    targets,
    weights,
    chat,
    actions,
    setLastCoachResponse,
  } = useAppState();
  const totals = useDayTotals();
  const todayMeals = useTodayMeals();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const verdict = useEntitlement("coach-unlimited");

  const profileSummary = useMemo(
    () =>
      `Female-tuned target. Age ${profile.age}, ${profile.heightCm} cm, currently ${profile.currentWeightKg} kg, goal ${profile.goalWeightKg} kg. Activity: ${profile.activityLevel}.`,
    [profile],
  );

  const recentSummary = useMemo(() => {
    const last = weights[weights.length - 1]?.weightKg;
    return [
      `Today: ${Math.round(totals.calories)} / ${targets.calories} kcal, ${Math.round(totals.proteinG)}g protein over ${todayMeals.length} meals.`,
      last != null ? `Latest weigh-in: ${last} kg.` : "No weigh-ins yet.",
    ].join(" ");
  }, [totals, targets, todayMeals.length, weights]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.length, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }

    actions.appendChat({ role: "user", content: message });
    setInput("");
    setBusy(true);
    setError(null);
    actions.bumpUsage("coach");

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, profileSummary, recentSummary }),
      });
      if (res.ok) {
        const json = await res.json();
        const coach = json.coach as CoachResponse;
        setLastCoachResponse(coach);
        actions.appendChat({
          role: "assistant",
          content: coach.reply,
          actions: coach.suggestedActions,
        });
      } else if (res.status === 503) {
        actions.appendChat({
          role: "assistant",
          content:
            "Coach is on hold (no API key). I'll mirror back: stay on plan, log the next meal, drink a glass of water. Tomorrow is a normal day, not a redo.",
          actions: ["Log next meal", "Drink water", "10 min walk"],
        });
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Coach failed.");
      }
    } catch {
      setError("Network unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · COACH
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Talk it <span className="text-forest">through.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Practical, calm. Not a cheerleader, not a drill sergeant.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="space-y-3 max-h-[55vh] overflow-y-auto pr-1"
      >
        {chat.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} actions={m.actions} />
        ))}
        {busy ? (
          <div className="text-xs text-muted">Coach is thinking…</div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      <Card>
        <Field label="Your message">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hard day, easy day, off-plan, on-plan — just write."
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
        </Field>
        <Button
          size="lg"
          fullWidth
          className="mt-3"
          onClick={send}
          loading={busy}
          disabled={!input.trim()}
        >
          <Send size={18} aria-hidden /> Send
        </Button>
      </Card>
      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="coach-unlimited"
      />
    </div>
  );
}

function Bubble({
  role,
  content,
  actions,
}: {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}) {
  if (role === "user") {
    return (
      <div className="bubble-anim flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-forest px-4 py-2.5 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="bubble-anim flex items-start gap-2">
      <IconBadge tone="sage">
        <Sparkles size={14} aria-hidden />
      </IconBadge>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/70 bg-white/65 backdrop-blur-xl px-4 py-2.5 text-sm text-ink-2">
        <p className="whitespace-pre-wrap">{content}</p>
        {actions && actions.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((a, i) => (
              <li
                key={i}
                className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] text-ink-2"
              >
                {a}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
