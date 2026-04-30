import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export async function POST(request: NextRequest) {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ exists: false });
  }

  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      return NextResponse.json(
        { error: "Could not check that email address." },
        { status: 503 },
      );
    }

    if (data.users.some((user) => user.email?.toLowerCase() === email)) {
      return NextResponse.json({ exists: true });
    }

    if (!data.nextPage || data.users.length === 0) {
      return NextResponse.json({ exists: false });
    }

    page = data.nextPage;
  }
}
