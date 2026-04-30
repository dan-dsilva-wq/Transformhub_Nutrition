"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { Mail, ArrowRight, UserPlus } from "lucide-react";
import { Button, Field, Input, Wordmark } from "./primitives";
import { getSupabase } from "@/lib/state/app-state";

const NATIVE_REDIRECT = "com.danieldsilva.pace://auth/callback";

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
    // Should not normally render  -  when supabase is unconfigured, auth.kind is "demo".
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
      setMessage("Check your inbox to confirm.");
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
    <div className="flex min-h-[100dvh] flex-col">
      <div className="stagger mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-16">
        <div className="slide-down-anim">
          <Wordmark size="lg" />
        </div>
        <h1 className="blur-in-anim font-display mt-10 text-4xl leading-[1.05] text-ink-2">
          Lose weight at your <span className="italic">own pace</span>.
        </h1>
        <p className="slide-up-anim mt-3 text-base text-muted">
          Snap a meal. See the next good move. No streak shame, no shouty graphics.
        </p>

        <form className="slide-up-anim mt-10 space-y-4" onSubmit={handleEmailAuth}>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {message ? (
            <p className="text-sm text-clay">{message}</p>
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
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {mode === "sign-in" ? "Sign in" : "Create account"} <ArrowRight size={18} />
          </Button>
        </form>

        <div className="slide-up-anim my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-faint">
          <span className="h-px flex-1 bg-hairline" /> or <span className="h-px flex-1 bg-hairline" />
        </div>

        <div className="slide-up-anim">
          <Button variant="secondary" size="lg" fullWidth onClick={handleGoogle}>
            <Mail size={16} /> Continue with Google
          </Button>
        </div>

        <button
          type="button"
          onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="slide-up-anim link-reveal mt-6 mx-auto text-sm text-muted"
        >
          {mode === "sign-in" ? "Need an account? Sign up." : "Have an account? Sign in."}
        </button>

        <p className="fade-anim mt-auto py-8 text-center text-xs text-faint">
          Adults only. General wellness coaching, not medical advice.
        </p>
      </div>
    </div>
  );
}
