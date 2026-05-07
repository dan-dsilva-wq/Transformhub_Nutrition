"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Search,
  ScanBarcode,
  Trash2,
  X,
} from "lucide-react";
import {
  getMealConfidenceLabel,
  type MealEstimate,
} from "@/lib/ai/schemas";
import { isPieceLikeUnit, parseFoodSearchQuery, type FoodSearchItem } from "@/lib/food-search";
import type { BarcodeProduct } from "@/lib/barcode-product";
import { useAppState, useTodayMeals } from "@/lib/state/app-state";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionHeader,
  Skeleton,
} from "./primitives";
import { clsx } from "clsx";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEntitlement } from "@/lib/entitlement";
import { PaywallSheet } from "./paywall-sheet";
import { Capacitor } from "@capacitor/core";
import {
  Camera as NativeCamera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";

async function captureNative(source: CameraSource): Promise<string | null> {
  try {
    const photo = await NativeCamera.getPhoto({
      source,
      resultType: CameraResultType.DataUrl,
      quality: 80,
      allowEditing: false,
      correctOrientation: true,
    });
    return photo.dataUrl ?? null;
  } catch {
    // User cancelled or denied permission  -  silent.
    return null;
  }
}

type Tab = "photo" | "search" | "barcode";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "photo", label: "Photo", icon: <Camera size={16} aria-hidden /> },
  { id: "search", label: "Type food", icon: <Search size={16} aria-hidden /> },
  { id: "barcode", label: "Barcode", icon: <ScanBarcode size={16} aria-hidden /> },
];

export function LogScreen() {
  const [tab, setTab] = useState<Tab>("photo");
  const router = useRouter();
  const { actions } = useAppState();
  const meals = useTodayMeals();

  return (
    <div className="stagger-up space-y-4">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          LOG · TODAY
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          What did you <span className="text-forest">eat?</span>
        </h1>
      </header>

      {/* Segmented tabs  -  glass pill */}
      <div className="grid grid-cols-3 gap-1 rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tap
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-white/85 text-ink-2 shadow-sm border border-white/70"
                : "text-muted hover:text-ink",
            )}
            aria-pressed={tab === t.id}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photo" ? <PhotoFlow onTypeFood={() => setTab("search")} /> : null}
      {tab === "search" ? <SearchFlow /> : null}
      {tab === "barcode" ? <BarcodeFlow /> : null}

      {meals.length > 0 ? (
        <section className="pt-2">
          <SectionHeader eyebrow="Logged" title="Today's meals" />
          <ul className="space-y-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="card-flat flex items-center gap-3.5 px-4 py-3"
              >
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-muted border border-white/70">
                    <ImageIcon size={15} aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-2">{m.name}</div>
                  <div className="text-xs text-muted">
                    {new Intl.DateTimeFormat("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(m.loggedAt))}{" "}
                    · {Math.round(m.proteinG)}g protein
                  </div>
                </div>
                <div className="numerals text-base text-ink-2">{m.calories}</div>
                <button
                  type="button"
                  data-tap
                  onClick={() => actions.removeMeal(m.id)}
                  aria-label={`Delete ${m.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-clay"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            fullWidth
            className="mt-4"
            onClick={() => router.push("/today")}
          >
            Done, back to today
          </Button>
        </section>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Photo flow ───────────────────────── */

function PhotoFlow({ onTypeFood }: { onTypeFood: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const estimateRunRef = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "demo" | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { actions } = useAppState();
  const verdict = useEntitlement("ai-photo-unlimited");

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setEstimate(null);
    setError(null);
    setSource(null);
    e.target.value = "";
    void runEstimate(dataUrl);
  }

  async function openCapture(kind: "camera" | "library") {
    // Only use the native plugin if the AAB actually has it installed.
    // Older AAB shells without @capacitor/camera return false here, in which
    // case we fall back to the HTML file input (which the WebView can show).
    const useNative =
      Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Camera");

    if (useNative) {
      const dataUrl = await captureNative(
        kind === "camera" ? CameraSource.Camera : CameraSource.Photos,
      );
      if (!dataUrl) return;
      setPreview(dataUrl);
      setEstimate(null);
      setError(null);
      setSource(null);
      void runEstimate(dataUrl);
      return;
    }

    // Web (and old-AAB) fallback: HTML file input. Camera button keeps
    // `capture="environment"`; library button drops it so Android shows
    // the gallery picker instead.
    const input = fileRef.current;
    if (!input) return;
    if (kind === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  async function runEstimate(imageDataUrl = preview) {
    if (!imageDataUrl) return;
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }
    const runId = estimateRunRef.current + 1;
    estimateRunRef.current = runId;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/meal-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (runId !== estimateRunRef.current) return;
      if (res.ok) {
        const json = await res.json();
        if (runId !== estimateRunRef.current) return;
        // Only count this against the daily free quota once the estimate
        // actually came back. Failed attempts shouldn't burn a free credit.
        actions.bumpUsage("ai-photo");
        setEstimate(json.estimate as MealEstimate);
        setSource("ai");
      } else if (res.status === 503) {
        // No OPENAI_API_KEY → demo fallback so the flow stays usable
        setEstimate(demoEstimate());
        setSource("demo");
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "We couldn't read that photo. Try a clearer shot or type the food.");
        setEstimate(demoEstimate());
        setSource("demo");
      }
    } catch {
      if (runId !== estimateRunRef.current) return;
      setError("No connection. Showing an example you can edit.");
      setEstimate(demoEstimate());
      setSource("demo");
    } finally {
      if (runId === estimateRunRef.current) setBusy(false);
    }
  }

  function save() {
    if (!estimate) return;
    actions.addMealFromEstimate(estimate, { imageUrl: preview ?? undefined });
    setPreview(null);
    setEstimate(null);
    setSource(null);
  }

  function discard() {
    estimateRunRef.current += 1;
    setPreview(null);
    setEstimate(null);
    setError(null);
    setSource(null);
    setBusy(false);
  }

  if (!preview) {
    return (
      <Card className="!p-7">
        <div className="flex flex-col items-center text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg,#a7f3d0,#bae6fd)",
              boxShadow: "0 6px 20px -8px rgba(13,148,136,0.45)",
            }}
            aria-hidden
          >
            <Camera size={22} className="text-ink-2" />
          </span>
          <h2 className="font-display mt-4 text-2xl text-ink-2">Snap your plate.</h2>
          <p className="mt-1.5 text-sm text-muted max-w-[28ch]">
            Take one photo. We&apos;ll work out the calories — you check it&apos;s right.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <Button size="lg" className="mt-6" onClick={() => openCapture("camera")}>
            <Camera size={18} /> Open camera
          </Button>
          <button
            type="button"
            onClick={() => openCapture("library")}
            className="mt-3 text-sm text-muted underline-offset-4 hover:underline"
          >
            Or upload from photos
          </button>
          <button
            type="button"
            onClick={onTypeFood}
            className="mt-3 text-sm font-medium text-forest underline-offset-4 hover:underline"
          >
            Type food instead
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!estimate ? (
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              {busy ? (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/35">
                  <Loader2 size={22} className="animate-spin text-white" aria-hidden />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl text-ink-2">
                {busy ? "Estimating your meal…" : "Photo ready"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {busy
                  ? "This usually takes 5–10 seconds. Hang tight."
                  : "Review the result once it appears."}
              </p>
              {error ? <p className="mt-1 text-sm text-clay">{error}</p> : null}
            </div>
            <button
              type="button"
              data-tap
              onClick={discard}
              aria-label="Discard"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-white/60"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      ) : (
        <EstimateEditor
          estimate={estimate}
          source={source}
          onChange={setEstimate}
          onSave={save}
          onDiscard={discard}
        />
      )}
      <PaywallSheet
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="ai-photo-unlimited"
      />
    </div>
  );
}

function EstimateEditor({
  estimate,
  source,
  onChange,
  onSave,
  onDiscard,
}: {
  estimate: MealEstimate;
  source: "ai" | "demo" | null;
  onChange: (e: MealEstimate) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  function updateItem(idx: number, patch: Partial<MealEstimate["items"][number]>) {
    const items = estimate.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...estimate, items, totals: sumItems(items) });
  }

  function updateItemCalories(idx: number, calories: number) {
    const item = estimate.items[idx];
    if (!item) return;
    const nextCalories = Math.max(calories, 0);
    const factor = item.calories > 0 ? nextCalories / item.calories : 1;

    updateItem(idx, {
      calories: Math.round(nextCalories),
      proteinG: scaleMacro(item.proteinG, factor),
      carbsG: scaleMacro(item.carbsG, factor),
      fatG: scaleMacro(item.fatG, factor),
      fiberG: scaleMacro(item.fiberG, factor),
    });
  }

  function updateTotalCalories(calories: number) {
    const nextCalories = Math.max(calories, 0);
    const factor = estimate.totals.calories > 0 ? nextCalories / estimate.totals.calories : 1;
    const items = scaleItems(estimate.items, factor, nextCalories);

    onChange({ ...estimate, items, totals: sumItems(items) });
  }

  function applyMilkVariant(idx: number, variant: (typeof milkVariants)[number]) {
    const item = estimate.items[idx];
    if (!item) return;
    const ml = inferMilkMl(item);
    const factor = ml / 100;
    updateItem(idx, {
      name: `${variant.label} milk`,
      portion: `${ml} ml`,
      calories: Math.round(variant.calories * factor),
      proteinG: Number((variant.proteinG * factor).toFixed(1)),
      carbsG: Number((variant.carbsG * factor).toFixed(1)),
      fatG: Number((variant.fatG * factor).toFixed(1)),
      fiberG: Number((variant.fiberG * factor).toFixed(1)),
    });
  }

  function addMissingItem() {
    const items: MealEstimate["items"] = [
      ...estimate.items,
      {
        name: "Missing item",
        portion: "1 serving",
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        confidence: 0.4,
      },
    ];
    onChange({ ...estimate, items, totals: sumItems(items), confidence: Math.min(estimate.confidence, 0.6) });
  }

  const headline = buildHeadline(estimate);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {source === "demo"
              ? "Demo estimate"
              : `Confidence ${getMealConfidenceLabel(estimate.confidence)}`}
          </div>
          <h3 className="font-display text-xl text-ink-2">{headline}</h3>
        </div>
        <button
          type="button"
          data-tap
          onClick={onDiscard}
          aria-label="Discard"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-white/60"
        >
          <X size={16} />
        </button>
      </div>

      {/* Headline totals */}
      <div className="mt-3 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <label className="flex items-baseline gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={Math.round(estimate.totals.calories)}
              onChange={(e) => updateTotalCalories(Number(e.target.value) || 0)}
              aria-label="Total calories"
              className="numerals w-24 bg-transparent text-3xl text-ink-2 outline-none"
            />
            <span className="text-sm text-muted">kcal</span>
          </label>
          <span className="text-sm text-muted">
            {Math.round(estimate.totals.proteinG)}g P · {Math.round(estimate.totals.carbsG)}g C · {Math.round(estimate.totals.fatG)}g F
          </span>
        </div>
      </div>

      {/* Compact item list */}
      <ul className="mt-3 space-y-1.5">
        {estimate.items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate text-ink-2">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted"> · {item.portion}</span>
            </span>
            <span className="numerals shrink-0 text-ink-2">
              {Math.round(item.calories)}
              <span className="text-xs text-muted"> kcal</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        data-tap
        onClick={() => setDetailsOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest underline-offset-4 hover:underline"
        aria-expanded={detailsOpen}
      >
        {detailsOpen ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        {detailsOpen ? "Hide details" : "Edit items & macros"}
      </button>

      {detailsOpen ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted">Edit calories and the macros scale to match.</p>
          <ul className="space-y-2">
            {estimate.items.map((item, idx) => (
              <li key={idx} className="rounded-2xl border border-white/70 bg-white/60 p-3 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink-2 outline-none"
                  />
                  <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-medium text-forest">
                    {getMealConfidenceLabel(item.confidence)}
                  </span>
                  <span className="numerals text-base text-ink-2">
                    <input
                      type="number"
                      value={item.calories}
                      onChange={(e) => updateItemCalories(idx, Number(e.target.value) || 0)}
                      className="w-16 bg-transparent text-right outline-none"
                    />
                  </span>
                  <span className="text-xs text-muted">kcal</span>
                </div>
                <input
                  value={item.portion}
                  onChange={(e) => updateItem(idx, { portion: e.target.value })}
                  aria-label={`Serving size for ${item.name}`}
                  className="mt-1 w-full bg-transparent text-xs text-muted outline-none"
                />
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted">
                  <MacroEdit label="P" value={item.proteinG} onChange={(v) => updateItem(idx, { proteinG: v })} />
                  <MacroEdit label="C" value={item.carbsG} onChange={(v) => updateItem(idx, { carbsG: v })} />
                  <MacroEdit label="F" value={item.fatG} onChange={(v) => updateItem(idx, { fatG: v })} />
                  <MacroEdit label="Fb" value={item.fiberG} onChange={(v) => updateItem(idx, { fiberG: v })} />
                </div>
                {isMilkItem(item.name) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {milkVariants.map((variant) => (
                      <button
                        key={variant.label}
                        type="button"
                        data-tap
                        onClick={() => applyMilkVariant(idx, variant)}
                        className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink hover:bg-white"
                      >
                        {variant.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-4 gap-3">
            <TotalBar letter="P" value={estimate.totals.proteinG} colorVar="--color-forest" />
            <TotalBar letter="C" value={estimate.totals.carbsG} colorVar="--color-sky" />
            <TotalBar letter="F" value={estimate.totals.fatG} colorVar="--color-clay" />
            <TotalBar letter="Fb" value={estimate.totals.fiberG} colorVar="--color-sage" />
          </div>

          <p className="text-xs text-muted">{estimate.safetyNote}</p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <Button onClick={onSave} size="lg" fullWidth>
          <Check size={18} /> Save to today
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={addMissingItem}>
            Add missing
          </Button>
          <Button variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    </Card>
  );
}

function buildHeadline(estimate: MealEstimate): string {
  const summary = estimate.summary?.trim() ?? "";
  // If the model returned a concise list, use it.
  if (summary && summary.length <= 60 && !/\b(estimated|portion|looks|visible|plate)\b/i.test(summary)) {
    return summary;
  }
  // Otherwise build one from the items.
  const parts = estimate.items
    .slice(0, 4)
    .map((it) => {
      const qty = it.portion?.match(/^\s*(\d+(?:\.\d+)?)\s*(\S+.*)?$/);
      if (qty) return `${qty[1]} ${it.name.toLowerCase()}`;
      return it.name;
    });
  if (parts.length === 0) return "Meal";
  return parts.join(", ");
}

function MacroEdit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-xl border border-white/70 bg-white/70 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-transparent text-right text-xs text-ink-2 outline-none"
      />
    </label>
  );
}

function TotalBar({
  letter,
  value,
  colorVar,
}: {
  letter: string;
  value: number;
  colorVar: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">{letter}</span>
        <span className="numerals text-xs text-ink-2">{Math.round(value)}g</span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.08]">
        <div
          className="h-full rounded-full"
          style={{ width: "100%", background: `var(${colorVar})` }}
        />
      </div>
    </div>
  );
}

function sumItems(items: MealEstimate["items"]): MealEstimate["totals"] {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      proteinG: acc.proteinG + it.proteinG,
      carbsG: acc.carbsG + it.carbsG,
      fatG: acc.fatG + it.fatG,
      fiberG: acc.fiberG + it.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/* ───────────────────────── Search flow ───────────────────────── */

function scaleMacro(value: number, factor: number) {
  return Number(Math.max(value * factor, 0).toFixed(1));
}

function scaleItems(items: MealEstimate["items"], factor: number, targetCalories: number) {
  let caloriesAssigned = 0;

  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    const calories = isLast
      ? Math.max(Math.round(targetCalories) - caloriesAssigned, 0)
      : Math.max(Math.round(item.calories * factor), 0);

    caloriesAssigned += calories;

    return {
      ...item,
      calories,
      proteinG: scaleMacro(item.proteinG, factor),
      carbsG: scaleMacro(item.carbsG, factor),
      fatG: scaleMacro(item.fatG, factor),
      fiberG: scaleMacro(item.fiberG, factor),
    };
  });
}

const milkVariants = [
  { label: "Full fat", calories: 64, proteinG: 3.3, carbsG: 4.7, fatG: 3.6, fiberG: 0 },
  { label: "Semi-skimmed", calories: 47, proteinG: 3.4, carbsG: 4.8, fatG: 1.7, fiberG: 0 },
  { label: "Skimmed", calories: 35, proteinG: 3.4, carbsG: 5, fatG: 0.1, fiberG: 0 },
] as const;

function isMilkItem(name: string) {
  return /\bmilk\b/i.test(name);
}

function inferMilkMl(item: MealEstimate["items"][number]) {
  const portionMl = item.portion.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilit)/i);
  if (portionMl) {
    return Number(portionMl[1]);
  }

  return Math.max(Math.round((item.calories / milkVariants[1].calories) * 100), 100);
}

function SearchFlow() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<FoodSearchItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({
    name: "",
    calories: "",
    proteinG: "0",
    carbsG: "0",
    fatG: "0",
    fiberG: "0",
  });
  const searchIdRef = useRef(0);
  const { actions } = useAppState();

  const search = useCallback(async (nextQuery = query) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const searchId = searchIdRef.current + 1;
    searchIdRef.current = searchId;
    setHasSearched(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(trimmed)}`);
      const contentType = res.headers.get("content-type") ?? "";

      if (searchId !== searchIdRef.current) return;

      if (!res.ok) {
        setResults([]);
        setError("Food search isn't responding right now. Please try again in a moment.");
        return;
      }

      if (!contentType.includes("application/json")) {
        setResults([]);
        setError("Food search isn't responding right now. Please try again in a moment.");
        return;
      }

      const json = await res.json();
      if (json.foods) {
        setResults(json.foods);
      } else {
        setResults([]);
        setError(json.error ?? "We couldn't find that. Try a simpler word.");
      }
    } catch {
      if (searchId !== searchIdRef.current) return;
      setResults([]);
      setError("No connection. Check your internet and try again.");
    } finally {
      if (searchId === searchIdRef.current) {
        setBusy(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      void search(trimmed);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, search]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setBusy(false);
    }
  }

  function pickFood(food: FoodSearchItem) {
    const requested = parseFoodSearchQuery(query).amount;
    const requestedGrams = requested
      ? isPieceLikeUnit(requested.unit)
        ? requested.quantity * food.servingGrams
        : requested.grams
      : food.servingGrams;

    setPicked(food);
    setGrams(String(Math.round(requestedGrams)));
  }

  function openCustom() {
    setCustom({
      name: query.trim() || "Custom food",
      calories: "",
      proteinG: "0",
      carbsG: "0",
      fatG: "0",
      fiberG: "0",
    });
    setCustomOpen(true);
    setPicked(null);
  }

  function saveCustom() {
    const name = custom.name.trim();
    if (!name) return;
    const calories = Math.max(Number(custom.calories) || 0, 0);
    actions.addMeal({
      name,
      calories: Math.round(calories),
      proteinG: Number((Number(custom.proteinG) || 0).toFixed(1)),
      carbsG: Number((Number(custom.carbsG) || 0).toFixed(1)),
      fatG: Number((Number(custom.fatG) || 0).toFixed(1)),
      fiberG: Number((Number(custom.fiberG) || 0).toFixed(1)),
    });
    setCustomOpen(false);
    setCustom({ name: "", calories: "", proteinG: "0", carbsG: "0", fatG: "0", fiberG: "0" });
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }

  function save() {
    if (!picked) return;
    const g = Math.max(Number(grams) || 0, 0);
    if (!g) return;
    const factor = g / 100;
    actions.addMeal({
      name: `${picked.name}${picked.brand ? ` · ${picked.brand}` : ""}`,
      calories: Math.round(picked.caloriesPer100g * factor),
      proteinG: Number((picked.proteinPer100g * factor).toFixed(1)),
      carbsG: Number((picked.carbsPer100g * factor).toFixed(1)),
      fatG: Number((picked.fatPer100g * factor).toFixed(1)),
      fiberG: Number((picked.fiberPer100g * factor).toFixed(1)),
    });
    setPicked(null);
    setGrams("100");
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }

  if (customOpen) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl text-ink-2">Custom food</h3>
            <p className="text-xs text-muted">Use this when search is not the right tool.</p>
          </div>
          <button
            type="button"
            data-tap
            onClick={() => setCustomOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/60"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <Field label="Food name" className="mt-4">
          <Input
            value={custom.name}
            onChange={(e) => setCustom((prev) => ({ ...prev, name: e.target.value }))}
          />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Calories">
            <Input
              type="number"
              inputMode="decimal"
              value={custom.calories}
              onChange={(e) => setCustom((prev) => ({ ...prev, calories: e.target.value }))}
            />
          </Field>
          <Field label="Protein (g)">
            <Input
              type="number"
              inputMode="decimal"
              value={custom.proteinG}
              onChange={(e) => setCustom((prev) => ({ ...prev, proteinG: e.target.value }))}
            />
          </Field>
          <Field label="Carbs (g)">
            <Input
              type="number"
              inputMode="decimal"
              value={custom.carbsG}
              onChange={(e) => setCustom((prev) => ({ ...prev, carbsG: e.target.value }))}
            />
          </Field>
          <Field label="Fat (g)">
            <Input
              type="number"
              inputMode="decimal"
              value={custom.fatG}
              onChange={(e) => setCustom((prev) => ({ ...prev, fatG: e.target.value }))}
            />
          </Field>
          <Field label="Fiber (g)">
            <Input
              type="number"
              inputMode="decimal"
              value={custom.fiberG}
              onChange={(e) => setCustom((prev) => ({ ...prev, fiberG: e.target.value }))}
            />
          </Field>
        </div>
        <Button size="lg" fullWidth className="mt-4" onClick={saveCustom} disabled={!custom.name.trim()}>
          <Check size={18} /> Add to today
        </Button>
      </Card>
    );
  }

  if (picked) {
    const g = Math.max(Number(grams) || 0, 0);
    const factor = g / 100;
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl text-ink-2">{picked.name}</h3>
            {picked.brand ? <p className="text-xs text-muted">{picked.brand}</p> : null}
          </div>
          <button
            type="button"
            data-tap
            onClick={() => setPicked(null)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/60"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <Field label="Amount" hint={`Default serving: ${picked.servingText}`} className="mt-4">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="flex-1"
            />
            <span className="text-sm text-muted">grams</span>
          </div>
        </Field>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          {([
            ["Cal", Math.round(picked.caloriesPer100g * factor), "--color-ink-2"],
            ["P", Math.round(picked.proteinPer100g * factor), "--color-forest"],
            ["C", Math.round(picked.carbsPer100g * factor), "--color-sky"],
            ["F", Math.round(picked.fatPer100g * factor), "--color-clay"],
          ] as const).map(([l, v, color]) => (
            <div key={l} className="rounded-2xl border border-white/70 bg-white/60 px-2 py-2 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.14em] text-faint">{l}</div>
              <div className="numerals text-base text-ink-2">{v}</div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.08]">
                <div className="h-full rounded-full" style={{ width: "100%", background: `var(${color})` }} />
              </div>
            </div>
          ))}
        </div>
        <Button size="lg" fullWidth className="mt-4" onClick={save}>
          <Check size={18} /> Add to today
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <Input
          placeholder="Type food, drink, or brand"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <Button type="submit" loading={busy}>Find</Button>
      </form>
      <button
        type="button"
        onClick={openCustom}
        className="mt-3 text-sm font-medium text-forest underline-offset-4 hover:underline"
      >
        Can&apos;t find it? Create custom food
      </button>
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
      {busy ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : results.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                data-tap
                onClick={() => pickFood(f)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-left backdrop-blur-xl hover:bg-white/80 transition"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink-2">{f.name}</div>
                  <div className="text-xs text-muted">
                    {f.brand ? `${f.brand} · ` : ""}{f.servingText}
                  </div>
                </div>
                <span className="numerals shrink-0 text-sm text-ink-2">
                  {Math.round((f.caloriesPer100g * f.servingGrams) / 100)}<span className="text-xs text-muted">/{f.servingText}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : hasSearched && query.trim().length >= 2 && !busy ? (
        <div className="mt-4 space-y-3">
          <EmptyState title="No matches" body="Try a simpler word, or create a custom food." />
          <Button variant="secondary" fullWidth onClick={openCustom}>
            Create custom food
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">
          Type a food, drink, or brand name to find it.
        </p>
      )}
    </Card>
  );
}

/* ───────────────────────── Barcode flow ───────────────────────── */

function BarcodeFlow() {
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [servings, setServings] = useState("1");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actions } = useAppState();

  const lookup = useCallback(async (nextCode = code) => {
    const trimmed = nextCode.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (res.ok && json.product) {
        setProduct(json.product);
        setScanning(false);
      } else {
        setError(json.error ?? "We couldn't find that barcode. You can type the food instead.");
      }
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }, [code]);

  function save() {
    if (!product) return;
    const n = Math.max(Number(servings) || 1, 0);
    actions.addMeal({
      name: `${product.name}${product.brand ? ` · ${product.brand}` : ""}`,
      calories: Math.round(product.calories * n),
      proteinG: Number((product.proteinG * n).toFixed(1)),
      carbsG: Number((product.carbsG * n).toFixed(1)),
      fatG: Number((product.fatG * n).toFixed(1)),
      fiberG: Number((product.fiberG * n).toFixed(1)),
      imageUrl: product.imageUrl,
    });
    setProduct(null);
    setCode("");
    setServings("1");
  }

  const handleScan = useCallback((nextCode: string) => {
    setCode(nextCode);
    void lookup(nextCode);
  }, [lookup]);

  const stopScanning = useCallback(() => setScanning(false), []);

  if (product) {
    const n = Math.max(Number(servings) || 1, 0);
    return (
      <Card>
        <div className="flex items-start gap-3">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/70 bg-white/60 text-muted backdrop-blur">
              <ScanBarcode size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl leading-tight text-ink-2">{product.name}</h3>
            {product.brand ? <p className="text-xs text-muted">{product.brand}</p> : null}
            <p className="text-xs text-muted">{product.servingSize}</p>
          </div>
          <button
            type="button"
            data-tap
            onClick={() => setProduct(null)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/60"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <Field label="Servings" className="mt-4">
          <Input type="number" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} />
        </Field>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          {([
            ["Cal", Math.round(product.calories * n), "--color-ink-2"],
            ["P", Math.round(product.proteinG * n), "--color-forest"],
            ["C", Math.round(product.carbsG * n), "--color-sky"],
            ["F", Math.round(product.fatG * n), "--color-clay"],
          ] as const).map(([l, v, color]) => (
            <div key={l} className="rounded-2xl border border-white/70 bg-white/60 px-2 py-2 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.14em] text-faint">{l}</div>
              <div className="numerals text-base text-ink-2">{v}</div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.08]">
                <div className="h-full rounded-full" style={{ width: "100%", background: `var(${color})` }} />
              </div>
            </div>
          ))}
        </div>
        <Button size="lg" fullWidth className="mt-4" onClick={save}>
          <Check size={18} /> Add to today
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <BarcodeScanner
        active={scanning}
        onScan={handleScan}
        onError={setError}
        onStop={stopScanning}
      />

      {!scanning ? (
        <Button
          type="button"
          size="lg"
          fullWidth
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
        >
          <ScanBarcode size={18} aria-hidden /> Scan barcode
        </Button>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        Or type the number from the back of the pack:
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          inputMode="numeric"
          placeholder="e.g. 5057545012345"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <Button onClick={() => void lookup()} loading={busy}>Look up</Button>
      </div>
      {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
    </Card>
  );
}

function BarcodeScanner({
  active,
  onScan,
  onError,
  onStop,
}: {
  active: boolean;
  onScan: (code: string) => void;
  onError: (message: string | null) => void;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const foundRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    foundRef.current = false;

    async function start() {
      if (!videoRef.current) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        onError("Camera scanning needs HTTPS or the installed app on most phones.");
        onStop();
        return;
      }

      try {
        const reader = new BrowserMultiFormatReader();
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || foundRef.current) return;
            foundRef.current = true;
            const text = result.getText();
            controlsRef.current?.stop();
            if (!cancelled) onScan(text);
          },
        );
      } catch {
        if (!cancelled) {
          onError("Could not open the camera. Check browser permission or use HTTPS.");
          onStop();
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, onError, onScan, onStop]);

  if (!active) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-white/60 bg-black">
      <div className="relative aspect-[4/3]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
      </div>
      <div className="flex items-center justify-between gap-3 bg-black px-4 py-3 text-white">
        <span className="text-sm">Line up the barcode in the box.</span>
        <button
          type="button"
          data-tap
          onClick={onStop}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Stop scanner"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function demoEstimate(): MealEstimate {
  return {
    summary: "Chicken rice bowl with vegetables",
    items: [
      { name: "Chicken breast", portion: "1 palm", calories: 230, proteinG: 42, carbsG: 0, fatG: 5, fiberG: 0, confidence: 0.7 },
      { name: "Rice", portion: "1 cupped hand", calories: 210, proteinG: 4, carbsG: 45, fatG: 1, fiberG: 1, confidence: 0.7 },
      { name: "Mixed vegetables", portion: "2 fists", calories: 95, proteinG: 4, carbsG: 16, fatG: 2, fiberG: 7, confidence: 0.7 },
      { name: "Cooking oil", portion: "1 thumb", calories: 90, proteinG: 0, carbsG: 0, fatG: 10, fiberG: 0, confidence: 0.5 },
    ],
    totals: { calories: 625, proteinG: 50, carbsG: 61, fatG: 18, fiberG: 8 },
    confidence: 0.65,
    editPrompts: ["Confirm whether sauce or oil was added.", "Adjust the rice portion if it was more than one cupped hand."],
    safetyNote: "Estimate only. Confirm before saving.",
  };
}
