"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { Mail, ArrowRight, UserPlus } from "lucide-react";
import { Button, Field, Input, BrandMark } from "./primitives";
import { getSupabase } from "@/lib/state/app-state";

const NATIVE_REDIRECT = "com.transformhub.app://auth/callback";

function authRedirect(): string {
  return Capacitor.isNativePlatform()
    ? NATIVE_REDIRECT
    : `${window.location.origin}/auth/callback`;
}

export function AuthScreen() {
  const supabase = useMemo(() => getSupabase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [missingEmail, setMissingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!supabase) {
    return null;
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setMissingEmail(false);

    const result =
      mode === "sign-in"
        ? await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase!.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: authRedirect() },
          });

    setIsSubmitting(false);

    if (result.error) {
      if (mode === "sign-in") {
        const exists = await checkEmailExists(email);

        if (exists === false) {
          setMissingEmail(true);
          setMessage("Email address doesn't exist.");
          return;
        }
      }

      setMessage(result.error.message);
      return;
    }
    if (mode === "sign-up") {
      setMessage("We sent you a confirmation email. Click the link in your inbox to finish.");
    }
  }

  async function handleGoogle() {
    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirect() },
    });
    setIsSubmitting(false);
    if (error) setMessage(error.message);
  }

  async function checkEmailExists(value: string): Promise<boolean | null> {
    const trimmedEmail = value.trim();

    if (!trimmedEmail) return null;

    try {
      const response = await fetch("/api/auth/email-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) return null;

      const payload = (await response.json()) as { exists?: unknown };
      return typeof payload.exists === "boolean" ? payload.exists : null;
    } catch {
      return null;
    }
  }

  function switchMode(nextMode: "sign-in" | "sign-up") {
    setMode(nextMode);
    setMessage(null);
    setMissingEmail(false);
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Ambient brand mark — sits behind the form, slowly rotating */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-16 z-0 opacity-[0.07] brand-spin-slow"
      >
        <BrandMark size={520} color="cyan" strokeWidth={5} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 z-0 opacity-[0.05]"
      >
        <BrandMark size={380} color="cyan" strokeWidth={4} />
      </div>

      <div className="stagger relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-12">
        {/* Brand lockup */}
        <div className="slide-down-anim flex items-center gap-3">
          <BrandMark size={42} color="cyan" strokeWidth={8} />
          <div className="flex flex-col leading-none">
            <span
              className="text-white"
              style={{
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "0.18em",
                lineHeight: 1,
              }}
            >
              TRANSFORM
            </span>
            <span
              style={{
                color: "#008fd0",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.36em",
                marginTop: 4,
              }}
            >
              HUB
            </span>
          </div>
        </div>

        <p className="blur-in-anim font-eyebrow mt-12 text-white/55">
          Performance Nutrition
        </p>
        <h1 className="blur-in-anim font-display mt-3 text-[44px] leading-[1.02] text-white">
          Build a body that <span className="italic" style={{ color: "#00aef0" }}>holds the work</span>.
        </h1>
        <p className="slide-up-anim mt-4 text-[15px] leading-relaxed text-white/65">
          Engineered nutrition tracking for high performers. Snap a meal,
          see your numbers, and let the system pace your transformation.
        </p>

        <form className="slide-up-anim mt-9 space-y-4" onSubmit={handleEmailAuth}>
          <FieldDark label="Email">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00aef0] focus:ring-2 focus:ring-[#00aef0]/30"
            />
          </FieldDark>
          <FieldDark
            label="Password"
            hint={mode === "sign-up" ? "At least 8 characters." : undefined}
          >
            <input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00aef0] focus:ring-2 focus:ring-[#00aef0]/30"
            />
          </FieldDark>
          {message ? (
            <p className="text-sm text-[#ff9f6e]">{message}</p>
          ) : null}
          {missingEmail ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => switchMode("sign-up")}
            >
              <UserPlus size={16} /> Create account with these details
            </Button>
          ) : null}
          <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="cyan-halo">
            {mode === "sign-in" ? "Sign in" : "Create account"} <ArrowRight size={18} />
          </Button>
        </form>

        <div className="slide-up-anim my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/35">
          <span className="h-px flex-1 bg-white/15" />
          or
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="slide-up-anim">
          <button
            type="button"
            data-tap
            onClick={handleGoogle}
            className="tap-bounce inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-base font-medium text-white hover:bg-white/[0.08] transition"
          >
            <Mail size={16} /> Continue with Google
          </button>
        </div>

        <button
          type="button"
          onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="slide-up-anim link-reveal mt-7 mx-auto text-sm text-white/55 hover:text-white"
        >
          {mode === "sign-in" ? "Need an account? Sign up." : "Have an account? Sign in."}
        </button>

        <p className="fade-anim mt-auto py-8 text-center text-[11px] uppercase tracking-[0.18em] text-white/30">
          For adults 18+ · Transform Hub is a tracking tool, not medical advice
        </p>
      </div>
    </div>
  );
}

function FieldDark({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.20em] text-white/55">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}
