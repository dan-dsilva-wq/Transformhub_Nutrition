"use client";

import { clsx } from "clsx";
import { useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

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
    "bg-forest text-white hover:bg-forest-2 active:bg-forest-2 disabled:bg-stone-2 disabled:text-faint",
  secondary:
    "bg-paper text-ink border border-stone-2 hover:bg-stone hover:border-hairline disabled:text-faint",
  ghost: "bg-transparent text-ink hover:bg-stone disabled:text-faint",
  destructive:
    "bg-clay text-white hover:opacity-90 disabled:bg-stone-2 disabled:text-faint",
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
  onPointerDown,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  function spawnRipple(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(e);
    const host = ref.current;
    if (!host || host.disabled) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.4;
    const span = document.createElement("span");
    span.className = "ripple-mark";
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${e.clientX - r.left - size / 2}px`;
    span.style.top = `${e.clientY - r.top - size / 2}px`;
    if (variant !== "primary") {
      // Slightly subtler ripple on light surfaces.
      span.style.background = "rgba(13,148,136,0.25)";
    }
    host.appendChild(span);
    window.setTimeout(() => span.remove(), 750);
  }

  return (
    <button
      ref={ref}
      type="button"
      data-tap
      disabled={disabled || loading}
      onPointerDown={spawnRipple}
      className={clsx(
        "ripple-host tap-bounce inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors disabled:cursor-not-allowed",
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

const inputBase =
  "w-full rounded-2xl border border-stone-2 bg-paper px-4 py-3 text-base text-ink outline-none transition placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-forest/15";

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
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#fb923c" />
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
        className="sheet-anim absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] border-t border-white/70 bg-white/80 shadow-elevated backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white/70 px-5 pt-3 pb-2 backdrop-blur-xl">
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

/* ───────────────────────── Wordmark ───────────────────────── */

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";
  return (
    <span className={clsx("font-display tracking-tight text-ink-2", cls)}>
      <span>Pace</span>
      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-forest align-baseline" />
    </span>
  );
}

/* ───────────────────────── Iconography helpers ───────────────────────── */

export function IconBadge({
  children,
  tone = "stone",
}: {
  children: ReactNode;
  tone?: "stone" | "forest" | "sage" | "amber" | "clay";
}) {
  const palette: Record<string, string> = {
    stone: "bg-stone text-ink-2",
    forest: "bg-forest text-white",
    sage: "bg-sage/15 text-sage",
    amber: "bg-amber/15 text-amber",
    clay: "bg-clay/15 text-clay",
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
    <div className="rounded-2xl border border-dashed border-stone-2 bg-paper/60 px-5 py-10 text-center">
      <p className="font-display text-lg text-ink-2">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
