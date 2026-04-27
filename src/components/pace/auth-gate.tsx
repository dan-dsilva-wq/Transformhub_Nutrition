"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppState } from "@/lib/state/app-state";
import { AuthScreen } from "./auth-screen";
import { Wordmark } from "./primitives";

/**
 * Routes children based on auth + onboarding state:
 *  - signed-out (Supabase configured) → Auth screen
 *  - signed-in / demo, not onboarded → push to /onboarding
 *  - hydrating → splash
 *  - otherwise → render children inside the shell
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { auth, isHydrating, hasOnboarded } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (isHydrating) return;
    if (auth.kind === "signed-out") return; // we render <AuthScreen /> below
    if (!hasOnboarded) {
      router.replace("/onboarding");
    }
  }, [auth.kind, isHydrating, hasOnboarded, router]);

  if (isHydrating) return <Splash />;
  if (auth.kind === "signed-out") return <AuthScreen />;
  if (!hasOnboarded) return <Splash />;

  return <>{children}</>;
}

function Splash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="text-center">
        <Wordmark size="lg" />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">
          Loading your day
        </p>
      </div>
    </div>
  );
}
