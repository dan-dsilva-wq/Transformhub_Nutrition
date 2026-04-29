"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Stage = "credentials" | "confirm" | "deleting" | "done";

export function DeleteAccountForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!supabase) {
    return (
      <div className="rounded-2xl border border-hairline bg-paper p-5 text-sm text-muted">
        Account deletion is unavailable in this environment. Please email{" "}
        <a
          className="underline underline-offset-4"
          href="mailto:vxvo.admin@gmail.com"
        >
          vxvo.admin@gmail.com
        </a>{" "}
        to delete your account.
      </div>
    );
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message || "Could not sign in. Please try again.");
      return;
    }
    setStage("confirm");
  }

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE (in capitals) to confirm.');
      return;
    }
    setStage("deleting");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not delete account. Please try again.");
        setStage("confirm");
        return;
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStage("confirm");
      return;
    }
    // Wipe any cached state on this device.
    try {
      window.localStorage.removeItem("pace.state.v1");
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("pace.state.v2:")) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    try {
      await supabase!.auth.signOut();
    } catch {
      /* ignore */
    }
    setStage("done");
  }

  if (stage === "done") {
    return (
      <div className="rounded-2xl border border-hairline bg-paper p-5 text-sm text-ink-2">
        <h2 className="text-base font-semibold text-ink">Account deleted</h2>
        <p className="mt-2 text-muted">
          Your Pace account and associated data have been permanently removed.
          Thanks for trying the app.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5">
      {stage === "credentials" ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Step 1 — Verify it&apos;s you
            </h2>
            <p className="mt-1 text-sm text-muted">
              Sign in with the email and password you used to create your Pace
              account.
            </p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink-2 outline-none focus:border-forest"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink-2 outline-none focus:border-forest"
            />
          </label>
          {error ? (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-2"
          >
            Continue
          </button>
        </form>
      ) : null}

      {stage === "confirm" || stage === "deleting" ? (
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Step 2 — Confirm permanent deletion
            </h2>
            <p className="mt-1 text-sm text-muted">
              Type <strong>DELETE</strong> below to permanently remove your
              account and every byte of data attached to it. This cannot be
              undone.
            </p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Confirmation
            </span>
            <input
              type="text"
              required
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink-2 outline-none focus:border-clay"
            />
          </label>
          {error ? (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={stage === "deleting"}
            className="w-full rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {stage === "deleting" ? "Deleting…" : "Permanently delete account"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
