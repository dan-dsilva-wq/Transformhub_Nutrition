import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ReviewBody {
  day: string;
  ratings: Record<string, number>;
  comment?: string;
  appVersion?: string;
}

function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isYmd(body.day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  if (!body.ratings || typeof body.ratings !== "object") {
    return NextResponse.json({ error: "Missing ratings" }, { status: 400 });
  }

  const cleanRatings: Record<string, number> = {};
  for (const [key, value] of Object.entries(body.ratings)) {
    if (typeof value === "number" && value >= 0 && value <= 5) {
      cleanRatings[key] = Math.round(value);
    }
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json(
      { error: "Reviews are unavailable in this environment." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to submit a review." },
      { status: 401 },
    );
  }

  const comment =
    typeof body.comment === "string" ? body.comment.slice(0, 2000) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.from("tester_reviews").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    day_reviewed: body.day,
    ratings: cleanRatings,
    comment,
    app_version: body.appVersion ?? null,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
