"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { CoachDraftMeal, CoachResponse } from "@/lib/ai/schemas";
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
import { trackTesterEvent } from "@/lib/tester/track";

const COACH_MEMORY_LIMIT = 5;

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
  const [hiddenDrafts, setHiddenDrafts] = useState<Set<number>>(() => new Set());
  const [addedDrafts, setAddedDrafts] = useState<Set<number>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const verdict = useEntitlement("coach-unlimited");

  const profileSummary = useMemo(
    () =>
      `${profile.sexForCalories}-tuned target. Age ${profile.age}, ${profile.heightCm} cm, currently ${profile.currentWeightKg} kg, goal ${profile.goalWeightKg} kg. Goal intent: ${profile.goalIntent ?? "auto"}. Activity: ${profile.activityLevel}.`,
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
    trackTesterEvent("coach_message_sent", { length: message.length });
    setInput("");
    setBusy(true);
    setError(null);
    actions.bumpUsage("coach");

    const recentMessages = chat.slice(-COACH_MEMORY_LIMIT).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, profileSummary, recentSummary, recentMessages }),
      });
      if (res.ok) {
        const json = await res.json();
        const coach = json.coach as CoachResponse;
        setLastCoachResponse(coach);
        actions.appendChat({
          role: "assistant",
          content: coach.reply,
          actions: coach.suggestedActions,
          draftMeal: coach.draftMeal ?? undefined,
        });
      } else if (res.status === 503) {
        actions.appendChat({
          role: "assistant",
          content:
            "Coach is taking a short break. While we're offline, here's the plan: log your next meal, drink a glass of water, take ten minutes outside. Tomorrow is a normal day, not a do-over.",
          actions: ["Log next meal", "Drink water", "10 min walk"],
        });
      } else {
        await res.json().catch(() => ({}));
        setError("Coach can't reply right now. Please try again in a moment.");
      }
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stagger-up flex h-full min-h-0 flex-col">
      <header className="shrink-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · COACH
        </p>
        <h1 className="font-display mt-1.5 text-[30px] leading-[1.05] text-ink-2">
          Talk it <span className="text-forest">through.</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Calm, practical answers. Ask anything about your day, your meals, or your plan.
        </p>
      </header>

      <div
        ref={scrollRef}
        className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {chat.map((m, i) => (
          <Bubble
            key={i}
            role={m.role}
            content={m.content}
            actions={m.actions}
            draftMeal={m.draftMeal}
            draftHidden={hiddenDrafts.has(i)}
            draftAdded={addedDrafts.has(i)}
            onAddDraft={(draft) => {
              actions.addMeal({
                name: draft.name,
                calories: Math.round(draft.calories),
                proteinG: Number(draft.proteinG.toFixed(1)),
                carbsG: Number(draft.carbsG.toFixed(1)),
                fatG: Number(draft.fatG.toFixed(1)),
                fiberG: Number(draft.fiberG.toFixed(1)),
                source: "coach",
              });
              setAddedDrafts((prev) => new Set(prev).add(i));
            }}
            onHideDraft={() => setHiddenDrafts((prev) => new Set(prev).add(i))}
          />
        ))}
        {busy ? (
          <div className="text-xs text-muted">Coach is thinking...</div>
        ) : null}
      </div>

      {error ? <p className="shrink-0 pt-2 text-sm text-clay">{error}</p> : null}

      <Card className="mt-3 shrink-0 !p-4">
        <Field label="Your message">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hard day, easy day, off-plan, on-plan. Just write."
            rows={2}
            className="min-h-[76px]"
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
  draftMeal,
  draftHidden,
  draftAdded,
  onAddDraft,
  onHideDraft,
}: {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  draftMeal?: CoachDraftMeal;
  draftHidden?: boolean;
  draftAdded?: boolean;
  onAddDraft?: (draft: CoachDraftMeal) => void;
  onHideDraft?: () => void;
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
        {draftMeal && !draftHidden ? (
          <DraftMealCard
            draftMeal={draftMeal}
            added={Boolean(draftAdded)}
            onAdd={onAddDraft}
            onDiscard={onHideDraft}
          />
        ) : null}
        {actions && actions.length > 0 && !draftMeal ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((a, i) => (
              <li
                key={i}
                className="rounded-full border border-[#00aef0]/30 bg-[#00aef0]/[0.10] px-2.5 py-1 text-[11px] font-semibold text-[#66c8e8] backdrop-blur"
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

function DraftMealCard({
  draftMeal,
  added,
  onAdd,
  onDiscard,
}: {
  draftMeal: CoachDraftMeal;
  added: boolean;
  onAdd?: (draft: CoachDraftMeal) => void;
  onDiscard?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: draftMeal.name,
    portion: draftMeal.portion ?? "1 serving",
    calories: String(Math.round(draftMeal.calories)),
    proteinG: String(Math.round(draftMeal.proteinG)),
    carbsG: String(Math.round(draftMeal.carbsG)),
    fatG: String(Math.round(draftMeal.fatG)),
    fiberG: String(Math.round(draftMeal.fiberG)),
  });

  const parsed: CoachDraftMeal = {
    name: draft.name.trim() || draftMeal.name,
    portion: draft.portion.trim() || "1 serving",
    calories: Math.max(Number(draft.calories) || 0, 0),
    proteinG: Math.max(Number(draft.proteinG) || 0, 0),
    carbsG: Math.max(Number(draft.carbsG) || 0, 0),
    fatG: Math.max(Number(draft.fatG) || 0, 0),
    fiberG: Math.max(Number(draft.fiberG) || 0, 0),
    confidence: draftMeal.confidence,
  };

  return (
    <div className="mt-3 rounded-2xl border border-forest/25 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-transparent text-sm font-semibold text-ink-2 outline-none"
              aria-label="Draft food name"
            />
          ) : (
            <div className="text-sm font-semibold text-ink-2">{parsed.name}</div>
          )}
          <div className="mt-0.5 text-xs text-muted">
            Estimated at {Math.round(parsed.calories)} kcal, {Math.round(parsed.proteinG)}g protein
          </div>
        </div>
        <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-medium text-forest">
          Draft
        </span>
      </div>

      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DraftInput
            label="Serving"
            value={draft.portion}
            onChange={(v) => setDraft((prev) => ({ ...prev, portion: v }))}
          />
          <DraftInput
            label="Calories"
            value={draft.calories}
            onChange={(v) => setDraft((prev) => ({ ...prev, calories: v }))}
          />
          <DraftInput
            label="Protein"
            value={draft.proteinG}
            onChange={(v) => setDraft((prev) => ({ ...prev, proteinG: v }))}
          />
          <DraftInput
            label="Carbs"
            value={draft.carbsG}
            onChange={(v) => setDraft((prev) => ({ ...prev, carbsG: v }))}
          />
          <DraftInput
            label="Fat"
            value={draft.fatG}
            onChange={(v) => setDraft((prev) => ({ ...prev, fatG: v }))}
          />
          <DraftInput
            label="Fiber"
            value={draft.fiberG}
            onChange={(v) => setDraft((prev) => ({ ...prev, fiberG: v }))}
          />
        </div>
      ) : null}

      {!added ? (
        <p className="mt-3 rounded-xl bg-sage/45 px-3 py-2 text-xs font-medium text-forest">
          Tap Add to today to log this estimate now. You can edit it first if needed.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          data-tap
          onClick={() => onAdd?.(parsed)}
          disabled={added}
          className="w-full rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:bg-stone-2 disabled:text-faint"
        >
          {added ? "Added" : "Add to today"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-tap
            onClick={() => setEditing((prev) => !prev)}
            className="rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-medium text-ink-2"
          >
            {editing ? "Done editing" : "Edit first"}
          </button>
          <button
            type="button"
            data-tap
            onClick={onDiscard}
            className="rounded-full px-3 py-2 text-xs font-medium text-muted"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numeric = label !== "Serving";
  return (
    <label className="rounded-xl border border-white/70 bg-white/70 px-2 py-1.5">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <input
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full bg-transparent text-xs text-ink-2 outline-none"
      />
    </label>
  );
}
