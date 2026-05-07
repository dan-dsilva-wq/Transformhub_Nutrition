"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { clsx } from "clsx";

interface ReviewItem {
  key: string;
  label: string;
  hint: string;
}

const items: ReviewItem[] = [
  { key: "today", label: "Today screen", hint: "The main rings + macros view" },
  { key: "logging", label: "Logging meals", hint: "Photo, search, manual entry" },
  { key: "foods", label: "Your foods", hint: "Picking what you eat" },
  { key: "week", label: "Week plan", hint: "The 7-day meal plan + recipes" },
  { key: "coach", label: "Coach", hint: "AI chat & nudges" },
  { key: "overall", label: "Overall feel", hint: "Speed, design, vibe" },
];

function fmtFriendly(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function DailyReviewSheet({
  day,
  onClose,
  onSubmitted,
}: {
  day: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratedCount = Object.keys(ratings).length;
  const canSubmit = ratedCount >= 1 && !submitting;

  function setRating(key: string, value: number) {
    setRatings((r) => ({ ...r, [key]: value }));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tester-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day,
          ratings,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not submit review");
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="fade-anim absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Daily review"
        className="sheet-anim relative mx-auto max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 shadow-elevated"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-2" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-forest/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-forest">
              Tester check-in
            </span>
            <h3 className="font-display mt-2 text-[26px] leading-tight text-ink-2">
              How did Pace feel yesterday?
            </h3>
            <p className="mt-1 text-xs text-muted">
              {fmtFriendly(day)} · about 20 seconds
            </p>
          </div>
          <button
            type="button"
            data-tap
            onClick={onClose}
            aria-label="Skip review"
            className="grid h-9 w-9 place-items-center rounded-full bg-paper text-muted hover:text-ink"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className={clsx(
                "rounded-2xl border px-3 py-2.5 transition",
                ratings[item.key]
                  ? "border-forest/30 bg-forest/[0.04]"
                  : "border-hairline bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-2">{item.label}</div>
                  <div className="truncate text-[11px] text-muted">{item.hint}</div>
                </div>
                <StarRow
                  value={ratings[item.key] ?? 0}
                  onChange={(v) => setRating(item.key, v)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Anything else? (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Bugs, ideas, what felt great or annoying..."
            rows={3}
            maxLength={2000}
            className="mt-1.5 w-full resize-none rounded-2xl border border-hairline bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {error ? (
          <p className="mt-2 rounded-xl bg-clay/10 px-3 py-2 text-xs text-clay">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            data-tap
            onClick={onClose}
            disabled={submitting}
            className="tap-bounce inline-flex h-11 flex-1 items-center justify-center rounded-full border border-stone-2 bg-paper text-sm text-ink"
          >
            Skip
          </button>
          <button
            type="button"
            data-tap
            onClick={submit}
            disabled={!canSubmit}
            className={clsx(
              "tap-bounce inline-flex h-11 flex-[1.5] items-center justify-center rounded-full text-sm font-medium shadow-elevated transition",
              canSubmit
                ? "bg-forest text-white"
                : "cursor-not-allowed bg-forest/40 text-white/80",
            )}
          >
            {submitting
              ? "Sending..."
              : ratedCount >= items.length
                ? "Send"
                : `Send (${ratedCount}/${items.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            data-tap
            onClick={() => onChange(n === value ? 0 : n)}
            aria-label={`Rate ${n} of 5`}
            className="grid h-7 w-7 place-items-center"
          >
            <Star
              size={18}
              className={clsx(
                "transition",
                filled ? "fill-amber stroke-amber" : "stroke-stone-2",
              )}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
