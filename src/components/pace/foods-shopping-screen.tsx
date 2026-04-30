"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Home,
  Printer,
  Share2,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppState } from "@/lib/state/app-state";
import { LockedState } from "./paywall-sheet";
import { recipeKeys, recipes } from "./foods/food-data";
import { recipeHasSkipped } from "./foods/shopping";
import {
  aisles,
  buildShoppingList,
  groupByAisle,
  type Aisle,
  type ShoppingItem,
} from "./foods/shopping";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mealSlotsFor(mealsPerDay: number): string[] {
  if (mealsPerDay <= 2) return ["Breakfast", "Dinner"];
  if (mealsPerDay >= 5) return ["Breakfast", "Mid-morning", "Lunch", "Afternoon", "Dinner"];
  if (mealsPerDay === 4) return ["Breakfast", "Lunch", "Snack", "Dinner"];
  return ["Breakfast", "Lunch", "Dinner"];
}

function pickRecipeKey(
  shift: number,
  dayIdx: number,
  slotIdx: number,
  banned: Set<string>,
  skipped: string[],
): string {
  const candidates = recipeKeys.filter((k) => {
    if (banned.has(k)) return false;
    const r = recipes[k];
    if (!r) return false;
    return !recipeHasSkipped(r, skipped);
  });
  const list = candidates.length > 0 ? candidates : recipeKeys;
  return list[(dayIdx + shift + slotIdx * 2) % list.length];
}

function weekStart(offsetWeeks: number): Date {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1) + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
  }).format(d);
}

interface WeekOption {
  label: string;
  range: string;
  weekIdx: number;
  shift: number;
}

function buildWeekOptions(): WeekOption[] {
  const cur = weekStart(0);
  const curEnd = new Date(cur);
  curEnd.setDate(curEnd.getDate() + 6);
  const next = weekStart(1);
  const nextEnd = new Date(next);
  nextEnd.setDate(nextEnd.getDate() + 6);

  return [
    {
      label: "This week",
      range: `${fmt(cur)} - ${fmt(curEnd)}`,
      weekIdx: 1,
      shift: 1,
    },
    {
      label: "Next week",
      range: `${fmt(next)} - ${fmt(nextEnd)}`,
      weekIdx: 2,
      shift: 3,
    },
  ];
}

export function FoodsShoppingScreen() {
  const { onboardingExtras, actions } = useAppState();
  const mealsPerDay = onboardingExtras.routine?.mealsPerDay ?? 3;
  const slots = useMemo(() => mealSlotsFor(mealsPerDay), [mealsPerDay]);
  const banned = useMemo(
    () => new Set(onboardingExtras.bannedRecipes ?? []),
    [onboardingExtras.bannedRecipes],
  );
  const skipped = useMemo(
    () => onboardingExtras.skippedIngredients ?? [],
    [onboardingExtras.skippedIngredients],
  );
  const overrides = useMemo(
    () => onboardingExtras.weekSwaps ?? {},
    [onboardingExtras.weekSwaps],
  );
  const checkedKeys = useMemo(
    () => new Set(onboardingExtras.shoppingChecked ?? []),
    [onboardingExtras.shoppingChecked],
  );
  const pantryStaples = useMemo(
    () => onboardingExtras.pantryStaples,
    [onboardingExtras.pantryStaples],
  );

  const weekOptions = useMemo(() => buildWeekOptions(), []);
  const [optionIdx, setOptionIdx] = useState(0);
  const [filterAisle, setFilterAisle] = useState<Aisle | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const opt = weekOptions[optionIdx];

  const meals = useMemo(() => {
    return dayNames.flatMap((_, dayIdx) =>
      slots.map((slotLabel, slotIdx) => {
        const positionKey = `${opt.weekIdx}|${dayIdx}|${slotIdx}`;
        const overridden = overrides[positionKey];
        const useOverride =
          overridden &&
          !banned.has(overridden) &&
          recipes[overridden] &&
          !recipeHasSkipped(recipes[overridden], skipped);
        const key = useOverride
          ? (overridden as string)
          : pickRecipeKey(opt.shift, dayIdx, slotIdx, banned, skipped);
        return { dayIdx, slot: slotLabel, key };
      }),
    );
  }, [opt, slots, banned, skipped, overrides]);

  const { items, pantryHits } = useMemo(
    () =>
      buildShoppingList(meals, {
        skippedIngredients: skipped,
        pantryStaples,
      }),
    [meals, skipped, pantryStaples],
  );

  const filteredItems = useMemo(() => {
    if (filterAisle === "all") return items;
    return items.filter((i) => i.aisle === filterAisle);
  }, [items, filterAisle]);

  const grouped = useMemo(() => groupByAisle(filteredItems), [filteredItems]);
  const aisleCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.aisle] = (m[it.aisle] ?? 0) + 1;
    return m;
  }, [items]);

  const totalCount = items.length;
  const checkedCount = items.filter((i) =>
    checkedKeys.has(`${opt.weekIdx}:${i.key}`),
  ).length;
  const progressPct = totalCount === 0 ? 0 : (checkedCount / totalCount) * 100;
  const estCost = Math.round(totalCount * 0.9 + 4);

  function toggleItem(item: ShoppingItem) {
    const k = `${opt.weekIdx}:${item.key}`;
    const next = new Set(checkedKeys);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    actions.setOnboardingExtras({ shoppingChecked: [...next] });
  }

  function markAll() {
    const next = new Set(checkedKeys);
    for (const it of items) next.add(`${opt.weekIdx}:${it.key}`);
    actions.setOnboardingExtras({ shoppingChecked: [...next] });
    setConfirmClear(false);
  }

  function clearAll() {
    const next = new Set(checkedKeys);
    for (const it of items) next.delete(`${opt.weekIdx}:${it.key}`);
    actions.setOnboardingExtras({ shoppingChecked: [...next] });
    setConfirmClear(false);
  }

  function removePantry(name: string) {
    const next = (onboardingExtras.pantryStaples ?? []).filter((n) => n !== name);
    actions.setOnboardingExtras({ pantryStaples: next });
  }

  function shareList() {
    const text = buildShareText(items, opt.label);
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      navigator.share({ title: `Shopping list — ${opt.label}`, text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      actions.setNotice("Shopping list copied");
    }
  }

  return (
    <LockedState feature="nutrition-guide">
      <div className="stagger-up space-y-4 pb-32">
        <div className="flex items-center justify-between">
          <Link
            href="/you/foods"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink-2 shadow-sm backdrop-blur"
            aria-label="Back to your week"
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted">
            {opt.range}
          </p>
          <button
            type="button"
            data-tap
            onClick={() => window.print()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink-2 shadow-sm backdrop-blur"
            aria-label="Export as PDF"
          >
            <Printer size={14} aria-hidden />
          </button>
        </div>

        <header>
          <h1 className="font-display text-[36px] leading-[1.0] text-ink-2">
            The list.
          </h1>
          <p className="mt-1 text-xs text-muted">
            Everything you need for the week, sorted by aisle.
          </p>
        </header>

        {/* week toggle */}
        <div className="flex gap-1 rounded-full glass p-1 bg-white/60 border border-white/85 backdrop-blur">
          {weekOptions.map((w, i) => (
            <button
              key={w.label}
              type="button"
              data-tap
              onClick={() => setOptionIdx(i)}
              className={clsx(
                "tap-bounce flex-1 rounded-full px-3 py-2 text-xs font-medium transition",
                optionIdx === i ? "bg-forest text-white" : "text-ink",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* hero */}
        <div
          className="rounded-3xl shadow-card overflow-hidden"
          style={{ background: "linear-gradient(160deg,#18241f,#2a4a3c)", color: "white" }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                  Total basket
                </p>
                <p className="font-display text-3xl mt-1 numerals">
                  {totalCount} item{totalCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl numerals">~£{estCost}</p>
                <p className="text-[10px] text-white/60">
                  est · {Object.keys(aisleCounts).length} aisles
                </p>
              </div>
            </div>
            <div
              className="mt-3 h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,.18)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: "#a7f3d0",
                  transition: "width 250ms ease",
                }}
              />
            </div>
            <p className="mt-1 text-[10.5px] text-white/70 numerals">
              {checkedCount} of {totalCount} in basket
            </p>
          </div>
          <div
            className="grid grid-cols-3 text-center text-[11.5px]"
            style={{ background: "rgba(0,0,0,.18)" }}
          >
            <button
              type="button"
              data-tap
              onClick={shareList}
              className="tap-bounce py-2.5 text-white"
            >
              <span className="inline-flex items-center gap-1.5">
                <Share2 size={12} aria-hidden /> Share
              </span>
            </button>
            <button
              type="button"
              data-tap
              onClick={() => window.print()}
              className="tap-bounce py-2.5 text-white border-l border-r"
              style={{ borderColor: "rgba(255,255,255,.1)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Printer size={12} aria-hidden /> Export
              </span>
            </button>
            <button
              type="button"
              data-tap
              onClick={() => setConfirmClear((v) => !v)}
              className="tap-bounce py-2.5"
              style={{ color: checkedCount === totalCount && totalCount > 0 ? "#fde1c4" : "#a7f3d0" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCheck size={12} aria-hidden />
                {checkedCount === totalCount && totalCount > 0 ? "Reset" : "Mark all"}
              </span>
            </button>
          </div>
          {confirmClear ? (
            <div
              className="px-3 pb-3 pt-2 text-[11.5px] flex items-center gap-2"
              style={{ background: "rgba(0,0,0,.18)", color: "white" }}
            >
              <span className="flex-1">
                {checkedCount === totalCount && totalCount > 0
                  ? "Clear all checks?"
                  : "Mark every item as bought?"}
              </span>
              <button
                type="button"
                data-tap
                onClick={() => setConfirmClear(false)}
                className="rounded-full px-3 py-1 text-[11px]"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-tap
                onClick={() =>
                  checkedCount === totalCount && totalCount > 0 ? clearAll() : markAll()
                }
                className="rounded-full px-3 py-1 text-[11px]"
                style={{ background: "#a7f3d0", color: "#18241f", fontWeight: 600 }}
              >
                {checkedCount === totalCount && totalCount > 0 ? "Clear" : "Yes, mark all"}
              </button>
            </div>
          ) : null}
        </div>

        {/* aisle filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <FilterChip
            active={filterAisle === "all"}
            onClick={() => setFilterAisle("all")}
            label={`All · ${totalCount}`}
          />
          {aisles.map((a) => {
            const c = aisleCounts[a.id] ?? 0;
            if (c === 0) return null;
            return (
              <FilterChip
                key={a.id}
                active={filterAisle === a.id}
                onClick={() => setFilterAisle(a.id)}
                label={`${a.emoji} ${a.label} ${c}`}
              />
            );
          })}
        </div>

        {/* aisle sections */}
        {totalCount === 0 ? (
          <EmptyList />
        ) : (
          aisles.map((a) => {
            const list = grouped.get(a.id);
            if (!list || list.length === 0) return null;
            return (
              <AisleSection
                key={a.id}
                aisleId={a.id}
                items={list}
                checkedKeys={checkedKeys}
                weekIdx={opt.weekIdx}
                onToggle={toggleItem}
              />
            );
          })
        )}

        {/* pantry */}
        {pantryHits.length > 0 ? (
          <section
            className="rounded-3xl shadow-card p-4"
            style={{
              background:
                "repeating-linear-gradient(45deg, rgba(31,95,74,.06) 0 6px, transparent 6px 12px), white",
            }}
          >
            <div className="flex items-center gap-2">
              <Home size={14} aria-hidden className="text-forest" />
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                Already at home
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              These are in recipes this week but we&rsquo;re leaving them off your list.
              Tap to put one back.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pantryHits.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-tap
                  onClick={() => removePantry(p)}
                  className="tap-bounce inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-1 text-[11.5px] font-medium text-forest"
                >
                  {p}
                  <X size={10} aria-hidden />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-[11px] text-muted text-center">
          Tap an item to check it off. Long-press a recipe ingredient on your week
          to skip it permanently.
        </p>

        <Link
          href="/you/settings#foods-to-skip"
          className="block rounded-3xl border border-hairline bg-white/60 px-4 py-3 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                Manage food preferences
              </p>
              <p className="text-sm text-ink-2 mt-0.5 font-medium">
                Foods to skip · pantry staples
              </p>
            </div>
            <ChevronRight size={16} className="text-muted" aria-hidden />
          </div>
        </Link>
      </div>
    </LockedState>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      data-tap
      onClick={onClick}
      className={clsx(
        "tap-bounce shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium border transition",
        active
          ? "bg-forest text-white border-forest shadow-sm"
          : "bg-white/70 text-ink border-white/85 backdrop-blur",
      )}
    >
      {label}
    </button>
  );
}

function AisleSection({
  aisleId,
  items,
  checkedKeys,
  weekIdx,
  onToggle,
}: {
  aisleId: Aisle;
  items: ShoppingItem[];
  checkedKeys: Set<string>;
  weekIdx: number;
  onToggle: (item: ShoppingItem) => void;
}) {
  const meta = aisles.find((a) => a.id === aisleId);
  if (!meta) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-full text-sm"
            style={{ background: meta.tint }}
          >
            {meta.emoji}
          </span>
          <p className="font-display text-lg text-ink-2">{meta.label}</p>
        </div>
        <p className="text-[11px] text-muted numerals">{items.length} items</p>
      </div>

      <div className="rounded-3xl bg-white/80 shadow-card overflow-hidden">
        {items.map((item, idx) => {
          const checked = checkedKeys.has(`${weekIdx}:${item.key}`);
          const days = item.occurrences
            .map((o) => `${o.day} ${o.slot.toLowerCase()}`)
            .slice(0, 2)
            .join(" · ");
          const more = item.occurrences.length > 2
            ? ` +${item.occurrences.length - 2}`
            : "";
          return (
            <button
              key={item.key}
              type="button"
              data-tap
              onClick={() => onToggle(item)}
              className={clsx(
                "tap-bounce w-full flex items-center gap-3 px-3 py-3 text-left transition",
                idx > 0 ? "border-t border-hairline" : "",
                item.hero && !checked
                  ? "bg-gradient-to-r from-forest/[0.08] to-transparent"
                  : "",
              )}
              aria-pressed={checked}
            >
              <span
                className={clsx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] transition",
                  checked
                    ? "border-forest bg-forest text-white"
                    : "border-hairline bg-white",
                )}
              >
                {checked ? <Check size={12} aria-hidden /> : null}
              </span>
              <span className="text-base shrink-0 leading-none">{item.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p
                    className={clsx(
                      "text-sm font-medium",
                      checked ? "text-faint line-through" : "text-ink-2",
                    )}
                  >
                    {item.name}
                    {item.count > 1 ? (
                      <span className="ml-1 text-xs text-muted numerals">
                        ×{item.count}
                      </span>
                    ) : null}
                  </p>
                  {item.hero ? (
                    <span className="rounded-full bg-forest/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-forest font-semibold">
                      ★ hero
                    </span>
                  ) : null}
                </div>
                {!checked ? (
                  <p className="mt-0.5 text-[10.5px] text-muted truncate">
                    {days}
                    {more}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EmptyList() {
  return (
    <div className="rounded-3xl border border-white/85 bg-white/55 p-8 text-center backdrop-blur-xl">
      <div className="text-4xl">🛒</div>
      <p className="mt-2 font-display text-lg text-ink-2">Empty basket</p>
      <p className="mt-1 text-xs text-muted">
        We couldn&rsquo;t find anything to shop for. Generate the week first or
        loosen your skipped ingredients in Settings.
      </p>
    </div>
  );
}

function buildShareText(items: ShoppingItem[], weekLabel: string): string {
  const lines: string[] = [`Shopping list — ${weekLabel}`, ""];
  const grouped = groupByAisle(items);
  for (const a of aisles) {
    const list = grouped.get(a.id);
    if (!list || list.length === 0) continue;
    lines.push(`${a.label.toUpperCase()}`);
    for (const it of list) {
      lines.push(`• ${it.name}${it.count > 1 ? ` ×${it.count}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
