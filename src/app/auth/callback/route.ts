import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  try {
    const parsed = new URL(value, "https://pace.local");
    if (parsed.origin !== "https://pace.local") {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function isLocalCallbackHost(host: string | null): boolean {
  return Boolean(
    host &&
      (host.startsWith("localhost") ||
        host.startsWith("127.") ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.endsWith(".local")),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (isLocalCallbackHost(host) ? "http" : "https");
  const origin = host ? `${proto}://${host}` : requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, origin));
}
