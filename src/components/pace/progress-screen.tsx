"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  ImagePlus,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Check,
  X,
} from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import type { CheckIn, WeightEntry } from "@/lib/state/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconBadge,
  Input,
  SectionHeader,
  Sheet,
  Stat,
  Textarea,
} from "./primitives";
import { useEntitlement } from "@/lib/entitlement";
import { PaywallSheet } from "./paywall-sheet";
import { Lock } from "lucide-react";

type RangeFilter = "week" | "month" | "year" | "all";

const rangeOptions: { id: RangeFilter; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];

const PREMIUM_RANGES: RangeFilter[] = ["year", "all"];

export function ProgressScreen() {
  const { weights, profile, targets, checkIns, actions } = useAppState();
  const historyVerdict = useEntitlement("progress-history-full");
  const [range, setRange] = useState<RangeFilter>(
    historyVerdict.allowed ? "all" : "month",
  );
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(null);
  const [historyPaywall, setHistoryPaywall] = useState(false);

  const datedWeights = useMemo(
    () => weights.map(toDatedWeight).filter(isDatedWeight),
    [weights],
  );
  const rangedWeights = useMemo(
    () => filterWeightsByRange(datedWeights, range),
    [datedWeights, range],
  );
  const photoCheckIns = useMemo(
    () => checkIns.filter((checkIn) => Boolean(checkIn.photoUrl)),
    [checkIns],
  );
  const selectedCheckIn =
    checkIns.find((checkIn) => checkIn.id === selectedCheckInId) ?? null;

  const stats = useMemo(() => deriveStats(datedWeights, profile.goalWeightKg), [
    datedWeights,
    profile.goalWeightKg,
  ]);
  const rangeStats = useMemo(() => deriveStats(rangedWeights, profile.goalWeightKg), [
    rangedWeights,
    profile.goalWeightKg,
  ]);

  return (
    <div className="stagger-up space-y-5">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          PROGRESS · TREND
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          The long, <span className="text-forest">slow</span> game.
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Trends, not days. Weigh-ins move; what we look for is the line.
        </p>
      </header>

      {/* Hero weight chart */}
      <Card className="!p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Current
            </div>
            <div className="numerals mt-1 flex items-baseline gap-2">
              <span className="text-3xl text-ink-2">
                {profile.currentWeightKg.toFixed(1)}
              </span>
              <span className="text-sm text-muted">kg</span>
              {stats.delta != null ? (
                <DeltaPill delta={stats.delta} />
              ) : null}
            </div>
            <div className="mt-1 text-xs text-muted">
              Goal {profile.goalWeightKg.toFixed(1)} kg
              {stats.toGo != null ? ` · ${stats.toGo.toFixed(1)} kg to go` : ""}
            </div>
          </div>
          <IconBadge tone="sage">
            <Scale size={18} aria-hidden />
          </IconBadge>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1 rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl">
          {rangeOptions.map((option) => {
            const locked =
              !historyVerdict.allowed && PREMIUM_RANGES.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                data-tap
                onClick={() => {
                  if (locked) {
                    setHistoryPaywall(true);
                    return;
                  }
                  setRange(option.id);
                }}
                aria-pressed={range === option.id}
                className={
                  "inline-flex items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-medium transition " +
                  (range === option.id
                    ? "bg-white/85 text-ink-2 shadow-sm border border-white/70"
                    : "text-muted hover:text-ink")
                }
              >
                {locked ? <Lock size={10} aria-hidden /> : null}
                {option.label}
              </button>
            );
          })}
        </div>

        <WeightChart weights={rangedWeights} goalKg={profile.goalWeightKg} />

        {rangedWeights.length > 1 ? (
          <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted">
            <span>{rangedWeights[0].date}</span>
            <span>{rangedWeights[rangedWeights.length - 1].date}</span>
          </div>
        ) : null}
      </Card>

      {/* Quick weigh-in */}
      <QuickWeighIn onSave={actions.addWeight} />

      {/* Insights */}
      <section>
        <SectionHeader eyebrow="This week" title="What the line says" />
        <div className="grid grid-cols-2 gap-3">
          <InsightTile
            label="Range trend"
            value={
              rangeStats.totalKg != null
                ? `${formatSign(rangeStats.totalKg)} kg`
                : "-"
            }
            hint={
              rangeStats.totalKg == null
                ? "Need two weigh-ins in range"
                : rangeStats.totalKg < 0
                  ? "Down in range"
                  : rangeStats.totalKg > 0
                    ? "Up in range"
                    : "Holding"
            }
          />
          <InsightTile
            label="Pace vs target"
            value={
              stats.weeklyKg != null
                ? `${Math.round(paceRatio(stats.weeklyKg, targets.weeklyWeightChangeKg) * 100)}%`
                : "-"
            }
            hint={
              targets.weeklyWeightChangeKg
                ? `Aim ${targets.weeklyWeightChangeKg.toFixed(2)} kg/wk`
                : ""
            }
          />
          <InsightTile
            label="Weigh-ins"
            value={`${stats.adherence}`}
            hint="Since first entry"
          />
          <InsightTile
            label="Total change"
            value={
              stats.totalKg != null ? `${formatSign(stats.totalKg)} kg` : "-"
            }
            hint={
              stats.weeks != null && stats.weeks > 0
                ? `Over ${stats.weeks} ${stats.weeks === 1 ? "week" : "weeks"}`
                : "Log to start"
            }
          />
        </div>
      </section>

      {/* Weekly photo */}
      <WeeklyPhoto />

      {/* Notes timeline */}
      <section>
        <SectionHeader
          eyebrow="Notes"
          title="Past check-ins"
          trailing={
            <span className="text-xs text-muted">
              {checkIns.length} {checkIns.length === 1 ? "entry" : "entries"}
            </span>
          }
        />
        {checkIns.length === 0 ? (
          <EmptyState
            title="No notes yet"
            body="A weekly line keeps the long game honest. Add one above."
          />
        ) : (
          <ul className="space-y-3">
            {checkIns.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  data-tap
                  onClick={() => setSelectedCheckInId(c.id)}
                  className="card-flat block w-full px-4 py-3 text-left"
                >
                <div className="flex min-w-0 items-start gap-3">
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photoUrl}
                      alt={`Check-in from ${c.date}`}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                        {c.date}
                      </span>
                      {c.energy || c.hunger ? (
                        <span className="shrink-0 text-[11px] text-muted">
                          {c.energy ? `Energy ${c.energy}/5` : ""}
                          {c.energy && c.hunger ? " · " : ""}
                          {c.hunger ? `Hunger ${c.hunger}/5` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-ink-2 whitespace-pre-wrap">
                      {c.note}
                    </p>
                  </div>
                </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CheckInViewer
        checkIn={selectedCheckIn}
        checkIns={photoCheckIns}
        onClose={() => setSelectedCheckInId(null)}
      />

      <PaywallSheet
        open={historyPaywall}
        onClose={() => setHistoryPaywall(false)}
        feature="progress-history-full"
      />
    </div>
  );
}

/* ───────────────────────── Weight chart ───────────────────────── */

function WeightChart({
  weights,
  goalKg,
}: {
  weights: DatedWeight[];
  goalKg: number;
}) {
  if (weights.length === 0) {
    return (
      <div className="mt-5 grid h-40 place-items-center rounded-2xl border border-white/70 bg-white/55 text-sm text-muted backdrop-blur-xl">
        Log your first weigh-in to see the line.
      </div>
    );
  }

  const w = 320;
  const h = 140;
  const padX = 6;
  const padY = 14;

  const all = [...weights.map((p) => p.weightKg), goalKg];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = Math.max(max - min, 1);

  const xs = (i: number) =>
    padX +
    (weights.length === 1
      ? (w - padX * 2) / 2
      : (i * (w - padX * 2)) / (weights.length - 1));
  const ys = (kg: number) =>
    padY + ((max - kg) / range) * (h - padY * 2);

  const points = weights.map((p, i) => `${xs(i)},${ys(p.weightKg)}`).join(" ");

  const area = `${xs(0)},${h - padY} ${points} ${xs(weights.length - 1)},${h - padY}`;

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-40 w-full"
        role="img"
        aria-label="Weight trend"
      >
        <line
          x1={padX}
          x2={w - padX}
          y1={ys(goalKg)}
          y2={ys(goalKg)}
          stroke="var(--color-amber)"
          strokeDasharray="3 4"
          strokeWidth="1"
          opacity="0.7"
        />
        <text
          x={w - padX}
          y={ys(goalKg) - 4}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-amber)"
          opacity="0.85"
        >
          Goal {goalKg.toFixed(1)}
        </text>
        <polygon points={area} fill="var(--color-forest)" opacity="0.08" />
        {weights.length > 1 ? (
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-forest)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {weights.map((p, i) => (
          <circle
            key={i}
            cx={xs(i)}
            cy={ys(p.weightKg)}
            r={i === weights.length - 1 ? 4 : 2.5}
            fill={
              i === weights.length - 1
                ? "var(--color-forest)"
                : "var(--color-paper)"
            }
            stroke="var(--color-forest)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}

/* ───────────────────────── Quick weigh-in ───────────────────────── */

function QuickWeighIn({ onSave }: { onSave: (kg: number) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function save() {
    const kg = Number(value);
    if (!Number.isFinite(kg) || kg <= 0) return;
    onSave(kg);
    setValue("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        size="lg"
        fullWidth
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <Scale size={18} aria-hidden /> Log weigh-in
      </Button>
    );
  }

  return (
    <Card>
      <Field label="Today's weight" hint="One number, take it on a wave.">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="80.4"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setValue(e.target.value)
            }
            autoFocus
          />
          <span className="text-sm text-muted">kg</span>
        </div>
      </Field>
      <div className="mt-4 flex gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
        >
          Cancel
        </Button>
        <Button onClick={save} fullWidth>
          <Check size={18} aria-hidden /> Save
        </Button>
      </div>
    </Card>
  );
}

/* ───────────────────────── Weekly photo ───────────────────────── */

function WeeklyPhoto() {
  const { actions } = useAppState();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [hunger, setHunger] = useState<number | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
  }

  function save() {
    if (!preview && !note.trim()) return;
    actions.addCheckIn({
      note: note.trim() || "Weekly check-in",
      photoUrl: preview,
      energy: energy ?? undefined,
      hunger: hunger ?? undefined,
    });
    setPreview(null);
    setNote("");
    setEnergy(null);
    setHunger(null);
  }

  return (
    <section>
      <SectionHeader
        eyebrow="This week"
        title="Photo & note"
        trailing={
          <span className="text-xs text-muted">One photo. One line.</span>
        }
      />
      <Card>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="block h-56 w-full object-cover"
            />
            <button
              type="button"
              data-tap
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white"
              aria-label="Discard photo"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-tap
            onClick={() => fileRef.current?.click()}
            className="grid h-40 w-full place-items-center rounded-2xl border border-dashed border-white/80 bg-white/45 text-muted backdrop-blur-xl hover:bg-white/65 transition"
          >
            <span className="flex flex-col items-center gap-2">
              <ImagePlus size={20} aria-hidden />
              <span className="text-sm">Add this week&apos;s photo</span>
              <span className="text-xs text-faint">
                Same spot, same light, same time
              </span>
            </span>
          </button>
        )}

        <Field label="Note" className="mt-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What worked. What didn't. One sentence each."
          />
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ScalePicker
            label="Energy"
            value={energy}
            onChange={setEnergy}
          />
          <ScalePicker
            label="Hunger"
            value={hunger}
            onChange={setHunger}
          />
        </div>

        <Button
          size="lg"
          fullWidth
          className="mt-4"
          onClick={save}
          disabled={!preview && !note.trim()}
        >
          <Camera size={18} aria-hidden /> Save check-in
        </Button>
      </Card>
    </section>
  );
}

function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <div className="mt-1.5 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              data-tap
              onClick={() => onChange(active ? null : n)}
              aria-pressed={active}
              className={
                "numerals grid h-9 min-w-0 place-items-center rounded-full border px-0 text-sm transition " +
                (active
                  ? "border-forest bg-forest text-white"
                  : "border-white/70 bg-white/60 text-ink backdrop-blur hover:bg-white/80")
              }
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Insight tile ───────────────────────── */

function CheckInViewer({
  checkIn,
  checkIns,
  onClose,
}: {
  checkIn: CheckIn | null;
  checkIns: CheckIn[];
  onClose: () => void;
}) {
  const [comparison, setComparison] = useState<"current" | "first">("current");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const compareVerdict = useEntitlement("compare-photos");
  const photoEntries = checkIns.filter((entry) => entry.photoUrl);
  const first = photoEntries.at(-1) ?? null;
  const current = photoEntries[0] ?? null;
  const compareTo = comparison === "first" ? first : current;

  return (
    <Sheet open={Boolean(checkIn)} onClose={onClose} title="Check-in photo">
      {checkIn ? (
        <div className="space-y-4 pb-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {checkIn.date}
            </div>
            <p className="mt-1 text-sm text-ink-2 whitespace-pre-wrap">{checkIn.note}</p>
          </div>

          {checkIn.photoUrl ? (
            <div className="grid grid-cols-2 gap-3">
              <PhotoPanel label="Selected" src={checkIn.photoUrl} date={checkIn.date} />
              <PhotoPanel
                label={comparison === "first" ? "First" : "Current"}
                src={compareTo?.photoUrl ?? null}
                date={compareTo?.date ?? ""}
              />
            </div>
          ) : (
            <EmptyState title="No photo" body="This check-in only has notes." />
          )}

          <div className="grid grid-cols-2 gap-2 rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl">
            <button
              type="button"
              data-tap
              onClick={() => setComparison("current")}
              aria-pressed={comparison === "current"}
              className={
                "rounded-full px-3 py-2 text-sm font-medium " +
                (comparison === "current"
                  ? "bg-white/85 text-ink-2 shadow-sm border border-white/70"
                  : "text-muted hover:text-ink")
              }
            >
              Current
            </button>
            <button
              type="button"
              data-tap
              onClick={() => {
                if (!compareVerdict.allowed) {
                  setPaywallOpen(true);
                  return;
                }
                setComparison("first");
              }}
              aria-pressed={comparison === "first"}
              className={
                "inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-medium " +
                (comparison === "first"
                  ? "bg-white/85 text-ink-2 shadow-sm border border-white/70"
                  : "text-muted hover:text-ink")
              }
            >
              {!compareVerdict.allowed ? <Lock size={11} aria-hidden /> : null}
              First
            </button>
          </div>
        </div>
      ) : null}
      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="compare-photos"
      />
    </Sheet>
  );
}

function PhotoPanel({
  label,
  src,
  date,
}: {
  label: string;
  src: string | null;
  date: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        {date ? <span className="truncate text-xs text-muted">{date}</span> : null}
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center rounded-2xl border border-white/70 bg-white/55 text-xs text-muted backdrop-blur-xl">
          No photo
        </div>
      )}
    </div>
  );
}

function InsightTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-flat p-4">
      <Stat label={label} value={value} hint={hint} />
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const Icon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const tone =
    delta < 0
      ? "bg-sage/15 text-sage"
      : delta > 0
        ? "bg-clay/15 text-clay"
        : "bg-white/60 border border-white/70 text-muted";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
        tone
      }
    >
      <Icon size={12} aria-hidden />
      {formatSign(delta)} kg
    </span>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function deriveStats(
  weights: { date: string; weightKg: number }[],
  goalKg: number,
) {
  if (weights.length === 0) {
    return {
      delta: null as number | null,
      totalKg: null as number | null,
      weeklyKg: null as number | null,
      toGo: null as number | null,
      weeks: null as number | null,
      adherence: 0,
    };
  }

  const first = weights[0].weightKg;
  const last = weights[weights.length - 1].weightKg;
  const totalKg = round1(last - first);
  const recent = weights.slice(-2);
  const weeklyKg =
    recent.length === 2 ? round1(recent[1].weightKg - recent[0].weightKg) : null;
  const delta = weights.length >= 2 ? round1(last - first) : null;
  const toGo = round1(last - goalKg);

  return {
    delta,
    totalKg,
    weeklyKg,
    toGo: toGo > 0 ? toGo : 0,
    weeks: weights.length - 1,
    adherence: weights.length,
  };
}

interface DatedWeight extends WeightEntry {
  dateValue: Date;
}

function toDatedWeight(entry: WeightEntry): DatedWeight | null {
  const dateValue = parseEntryDate(entry);
  if (!dateValue) return null;
  return { ...entry, dateValue };
}

function isDatedWeight(entry: DatedWeight | null): entry is DatedWeight {
  return entry != null;
}

function parseEntryDate(entry: { date: string; isoDate?: string }) {
  if (entry.isoDate) {
    const parsed = new Date(`${entry.isoDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const currentYear = new Date().getFullYear();
  const parsed = new Date(`${entry.date} ${currentYear}`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function filterWeightsByRange(weights: DatedWeight[], range: RangeFilter) {
  if (range === "all" || weights.length === 0) return weights;

  const now = new Date();
  const start = new Date(now);
  if (range === "week") {
    start.setDate(now.getDate() - 6);
  } else if (range === "month") {
    start.setMonth(now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return weights.filter((entry) => entry.dateValue >= start);
}

function paceRatio(actualKg: number, targetKg: number) {
  if (!targetKg) return 0;
  const a = Math.abs(actualKg);
  const t = Math.abs(targetKg);
  if (actualKg > 0 && targetKg < 0) return 0;
  if (actualKg < 0 && targetKg > 0) return 0;
  return Math.min(a / t, 1.5);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatSign(n: number) {
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return n.toFixed(1);
  return "0.0";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
