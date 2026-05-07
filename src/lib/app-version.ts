"use client";

import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const WEB_FALLBACK = "3.0";

/**
 * Returns the current app version. On native (Capacitor) this reads the real
 * versionName + versionCode from the installed AAB. On web it falls back to
 * a hand-bumped constant. Bump WEB_FALLBACK when shipping a release that
 * changes user-visible behaviour, so testers reporting issues from the web
 * see the right number too.
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(WEB_FALLBACK);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    CapacitorApp.getInfo()
      .then((info) => {
        if (cancelled) return;
        setVersion(`${info.version} (${info.build})`);
      })
      .catch(() => {
        /* keep web fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
