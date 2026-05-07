"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export { Wordmark, BrandMark, BrandHero, BrandLogo } from "./brand";

/* ───────────────────────── Button ───────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "md" | "lg" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-[linear-gradient(180deg,#00aef0_0%,#008fd0_55%,#0078b8_100%)] border border-[#00c9ff]/35 hover:bg-[linear-gradient(180deg,#1ec0ff_0%,#00aef0_55%,#008fd0_100%)] active:translate-y-[1px] disabled:bg-none disabled:bg-white/[0.06] disabled:text-white/40 disabled:border-white/15 shadow-[0_14px_32px_-10px_rgba(0,143,208,0.65),0_1px_0_rgba(255,255,255,0.40)_inset,0_-1px_0_rgba(0,40,60,0.40)_inset]",
  secondary:
    "text-white bg-white/[0.06] border border-white/20 hover:bg-white/[0.12] hover:border-white/30 disabled:bg-white/[0.04] disabled:text-white/35 disabled:border-white/10 backdrop-blur-xl",
  ghost: "bg-transparent text-white/80 hover:bg-white/10 hover:text-white disabled:text-white/35",
  destructive:
    "bg-clay text-white hover:opacity-90 disabled:bg-white/[0.06] disabled:text-white/40",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      data-tap
      disabled={disabled || loading}
      className={clsx(
        "tap-bounce inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors disabled:cursor-not-allowed",
        variant === "primary" && "cta-glow",
        variantClass[variant],
        sizeClass[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── Card ───────────────────────── */

export function Card({
  className,
  children,
  flat,
  tint,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { flat?: boolean; tint?: boolean }) {
  return (
    <div
      className={clsx(
        flat ? "card-flat" : tint ? "card-tint" : "card",
        "p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── SectionHeader ───────────────────────── */

export function SectionHeader({
  eyebrow,
  title,
  trailing,
  className,
}: {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl leading-tight text-ink-2">{title}</h2>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

/* ───────────────────────── Field ───────────────────────── */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
      ) : null}
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/* Inputs sit on dark glass everywhere: translucent white field with cyan
   focus ring. Inside the rare .card-light surface they flip to true paper. */
const inputBase =
  "w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#00aef0] focus:ring-2 focus:ring-[#00aef0]/30 [.card-light_&]:border-stone-2 [.card-light_&]:bg-paper [.card-light_&]:text-ink [.card-light_&]:placeholder:text-faint [.card-light_&]:focus:border-forest";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputBase, "h-12", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(inputBase, "h-12 appearance-none pr-10", props.className)} />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputBase, "min-h-[96px] py-3", props.className)} />;
}

/* ───────────────────────── ProgressRing ───────────────────────── */

interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  trackColor?: string;
  fillColor?: string;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ProgressRing({
  value,
  size = 168,
  stroke = 12,
  trackColor = "var(--color-stone-2)",
  fillColor = "var(--color-forest)",
  children,
  className,
  ariaLabel,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);

  const usingDefaultFill = fillColor === "var(--color-forest)";
  const gradientId = `pace-ring-grad-${size}-${stroke}`;
  const strokeRef = usingDefaultFill ? `url(#${gradientId})` : fillColor;

  return (
    <div className={clsx("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        className="-rotate-90"
      >
        {usingDefaultFill ? (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00aef0" />
              <stop offset="55%" stopColor="#008fd0" />
              <stop offset="100%" stopColor="#003c53" />
            </linearGradient>
          </defs>
        ) : null}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={usingDefaultFill ? "rgba(15,23,20,0.08)" : trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeRef}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── Stat ───────────────────────── */

export function Stat({
  label,
  value,
  hint,
  trailing,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </div>
        <div className="numerals mt-1 text-2xl text-ink-2">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

/* ───────────────────────── Sheet (bottom drawer) ───────────────────────── */

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="card sheet-anim absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto !rounded-t-[28px] !rounded-b-none !border-x-0 !border-b-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white/85 px-5 pt-3 pb-2 backdrop-blur-xl">
          <div className="mx-auto h-1 w-10 rounded-full bg-stone-2 absolute left-1/2 -translate-x-1/2 top-2" />
          <h3 className="font-display text-xl text-ink-2 mt-3">{title}</h3>
          <button
            type="button"
            data-tap
            onClick={onClose}
            className="rounded-full text-muted hover:text-ink mt-2"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="stagger-up px-5 pt-2">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

/* Wordmark, BrandMark, BrandHero, BrandLogo are re-exported from ./brand */

/* ───────────────────────── Iconography helpers ───────────────────────── */

export function IconBadge({
  children,
  tone = "stone",
}: {
  children: ReactNode;
  tone?: "stone" | "forest" | "sage" | "amber" | "clay";
}) {
  // Glass-cyan default works on dark canvas and dark-glass cards. Light
  // surfaces (.card-light) get a solid stone fill for legibility.
  const palette: Record<string, string> = {
    stone:
      "bg-white/[0.08] text-[#00aef0] border border-white/15 [.card-light_&]:bg-stone [.card-light_&]:text-ink-2 [.card-light_&]:border-transparent",
    forest: "bg-forest text-white",
    sage: "bg-sage/20 text-sage",
    amber: "bg-amber/20 text-amber",
    clay: "bg-clay/20 text-clay",
  };
  return (
    <span
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        palette[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── EmptyState ───────────────────────── */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-5 py-10 text-center backdrop-blur-xl">
      <p className="font-display text-lg text-white">{title}</p>
      {body ? <p className="mt-1 text-sm text-white/60">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
