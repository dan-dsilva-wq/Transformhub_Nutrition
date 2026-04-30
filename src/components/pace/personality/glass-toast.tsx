"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import { SproutAvatar } from "./sprout";
import type { SproutMood } from "./sprout";

export interface GlassToast {
  id: number;
  title: string;
  body?: string;
  emoji?: string;
  mood?: SproutMood;
  durationMs?: number;
  /** Use Sprout avatar on the left. Default true. */
  withSprout?: boolean;
}

interface ToastContextValue {
  show: (t: Omit<GlassToast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      // Silent fallback so call sites don't have to guard in tests.
      show: () => {},
    } satisfies ToastContextValue;
  }
  return ctx;
}

export function GlassToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<GlassToast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((t: Omit<GlassToast, "id">) => {
    const id = ++idRef.current;
    const item: GlassToast = {
      durationMs: 3600,
      withSprout: true,
      ...t,
      id,
    };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((p) => p.id !== id));
    }, item.durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastBubble key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ toast }: { toast: GlassToast }) {
  return (
    <div
      className={clsx(
        "toast-in-anim pointer-events-auto flex max-w-[360px] items-center gap-3 rounded-2xl px-3.5 py-2.5",
        "border border-white/40 text-ink-2",
      )}
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        boxShadow:
          "0 14px 38px rgba(15,23,20,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
      }}
    >
      {toast.withSprout ? (
        <SproutAvatar size={36} mood={toast.mood ?? "happy"} />
      ) : toast.emoji ? (
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/60 text-lg"
        >
          {toast.emoji}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">{toast.title}</div>
        {toast.body ? (
          <div className="text-xs text-muted">{toast.body}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Hook to fire a celebratory milestone toast from any client component. */
export function useMilestoneToast() {
  const { show } = useToast();
  const seenRef = useRef<Set<string>>(new Set());

  return useCallback(
    (
      key: string,
      payload: Omit<GlassToast, "id">,
    ) => {
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      show(payload);
    },
    [show],
  );
}

/** Hook that watches `value`; whenever it crosses `threshold`, fires `onCross`. */
export function useThresholdEffect(
  value: number,
  threshold: number,
  onCross: () => void,
) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (prev.current != null && prev.current < threshold && value >= threshold) {
      onCross();
    }
    prev.current = value;
  }, [value, threshold, onCross]);
}
