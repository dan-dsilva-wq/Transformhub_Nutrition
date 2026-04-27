"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Image as ImageIcon,
  Search,
  ScanBarcode,
  Trash2,
  X,
} from "lucide-react";
import {
  getMealConfidenceLabel,
  type MealEstimate,
} from "@/lib/ai/schemas";
import type { FoodSearchItem } from "@/lib/food-search";
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
  Textarea,
} from "./primitives";
import { clsx } from "clsx";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEntitlement } from "@/lib/entitlement";
import { PaywallSheet } from "./paywall-sheet";

type Tab = "photo" | "search" | "barcode";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "photo", label: "Photo", icon: <Camera size={16} aria-hidden /> },
  { id: "search", label: "Search", icon: <Search size={16} aria-hidden /> },
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

      {/* Segmented tabs — glass pill */}
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

      {tab === "photo" ? <PhotoFlow /> : null}
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
                    · {m.proteinG}g protein
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
            Done — back to today
          </Button>
        </section>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Photo flow ───────────────────────── */

function PhotoFlow() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
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
  }

  async function runEstimate() {
    if (!preview) return;
    if (!verdict.allowed) {
      setPaywallOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      actions.bumpUsage("ai-photo");
      const res = await fetch("/api/ai/meal-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl: preview, note: note.trim() || undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        setEstimate(json.estimate as MealEstimate);
        setSource("ai");
      } else if (res.status === 503) {
        // No OPENAI_API_KEY → demo fallback so the flow stays usable
        setEstimate(demoEstimate(note));
        setSource("demo");
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Estimate failed.");
        setEstimate(demoEstimate(note));
        setSource("demo");
      }
    } catch {
      setError("Network unavailable. Showing a demo estimate.");
      setEstimate(demoEstimate(note));
      setSource("demo");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!estimate) return;
    actions.addMealFromEstimate(estimate, { imageUrl: preview ?? undefined });
    setPreview(null);
    setEstimate(null);
    setNote("");
    setSource(null);
  }

  function discard() {
    setPreview(null);
    setEstimate(null);
    setNote("");
    setError(null);
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
            One photo. We&apos;ll do the maths and you confirm.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <Button size="lg" className="mt-6" onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> Open camera
          </Button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 text-sm text-muted underline-offset-4 hover:underline"
          >
            Or upload from photos
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="!p-3">
        <div className="relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="block h-64 w-full object-cover" />
          <button
            type="button"
            data-tap
            onClick={discard}
            aria-label="Discard"
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white"
          >
            <X size={16} />
          </button>
        </div>
      </Card>

      {!estimate ? (
        <Card>
          <Field label="Optional note" hint="E.g. 'extra rice', 'no oil', 'sharing this'.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the photo doesn't show…"
            />
          </Field>
          <Button size="lg" fullWidth className="mt-4" onClick={runEstimate} loading={busy}>
            Estimate this meal
          </Button>
          {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
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
  function updateItem(idx: number, patch: Partial<MealEstimate["items"][number]>) {
    const items = estimate.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...estimate, items, totals: sumItems(items) });
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {source === "demo" ? "Demo estimate" : `Confidence ${getMealConfidenceLabel(estimate.confidence)}`}
          </div>
          <h3 className="font-display text-xl text-ink-2">{estimate.summary}</h3>
        </div>
        <button
          type="button"
          data-tap
          onClick={onDiscard}
          aria-label="Discard"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/60"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {estimate.items.map((item, idx) => (
          <li key={idx} className="rounded-2xl border border-white/70 bg-white/60 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink-2 outline-none"
              />
              <span className="numerals text-base text-ink-2">
                <input
                  type="number"
                  value={item.calories}
                  onChange={(e) => updateItem(idx, { calories: Number(e.target.value) || 0 })}
                  className="w-16 bg-transparent text-right outline-none"
                />
              </span>
              <span className="text-xs text-muted">kcal</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted">
              <MacroEdit label="P" value={item.proteinG} onChange={(v) => updateItem(idx, { proteinG: v })} />
              <MacroEdit label="C" value={item.carbsG} onChange={(v) => updateItem(idx, { carbsG: v })} />
              <MacroEdit label="F" value={item.fatG} onChange={(v) => updateItem(idx, { fatG: v })} />
              <MacroEdit label="Fb" value={item.fiberG} onChange={(v) => updateItem(idx, { fiberG: v })} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-xl">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Total</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="numerals text-3xl text-ink-2">{Math.round(estimate.totals.calories)}</span>
          <span className="text-sm text-muted">
            {Math.round(estimate.totals.proteinG)}g P · {Math.round(estimate.totals.carbsG)}g C · {Math.round(estimate.totals.fatG)}g F
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          <TotalBar letter="P" value={estimate.totals.proteinG} colorVar="--color-forest" />
          <TotalBar letter="C" value={estimate.totals.carbsG} colorVar="--color-sky" />
          <TotalBar letter="F" value={estimate.totals.fatG} colorVar="--color-clay" />
          <TotalBar letter="Fb" value={estimate.totals.fiberG} colorVar="--color-sage" />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">{estimate.safetyNote}</p>

      <div className="mt-4 flex gap-3">
        <Button variant="ghost" onClick={onDiscard} size="lg">
          Discard
        </Button>
        <Button onClick={onSave} size="lg" fullWidth>
          <Check size={18} /> Save meal
        </Button>
      </div>
    </Card>
  );
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

function SearchFlow() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<FoodSearchItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const { actions } = useAppState();

  async function search() {
    if (query.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query.trim())}`);
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        setResults([]);
        setError(`Food search failed (${res.status}). Check the app server/API route.`);
        return;
      }

      if (!contentType.includes("application/json")) {
        setResults([]);
        setError("Food search returned a page instead of data. The app is probably using an old deployment.");
        return;
      }

      const json = await res.json();
      if (json.foods) {
        setResults(json.foods);
      } else {
        setResults([]);
        setError(json.error ?? "Couldn't search foods.");
      }
    } catch {
      setResults([]);
      setError("Network unavailable.");
    } finally {
      setBusy(false);
    }
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
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search foods (e.g. 'banana', 'oats')…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button onClick={search} loading={busy}>Search</Button>
      </div>
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
                onClick={() => setPicked(f)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-left backdrop-blur-xl hover:bg-white/80 transition"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink-2">{f.name}</div>
                  <div className="text-xs text-muted">
                    {f.brand ? `${f.brand} · ` : ""}{f.servingText}
                  </div>
                </div>
                <span className="numerals shrink-0 text-sm text-ink-2">
                  {Math.round(f.caloriesPer100g)}<span className="text-xs text-muted">/100g</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.length >= 2 && !busy ? (
        <EmptyState title="No matches" body="Try a simpler word — 'oats' beats 'overnight oats'." />
      ) : (
        <p className="mt-4 text-xs text-muted">
          Powered by USDA FoodData Central. Branded items also available.
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
        setError(json.error ?? "Barcode not found.");
      }
    } catch {
      setError("Network unavailable.");
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
        Powered by Open Food Facts. Manual entry is here as backup.
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

function demoEstimate(note: string): MealEstimate {
  return {
    summary: note.trim() || "Chicken rice bowl with vegetables",
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
