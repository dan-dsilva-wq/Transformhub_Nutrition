import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const USER_FILE_BUCKETS = ["meal-photos", "progress-photos"] as const;

async function purgeUserStorage(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
) {
  if (!admin) return;
  // Files are stored as `<userId>/<filename>` in each bucket. List the user's
  // folder and remove every object inside. We page in case a user has lots.
  for (const bucket of USER_FILE_BUCKETS) {
    let offset = 0;
    const pageSize = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(userId, { limit: pageSize, offset });
      if (error || !data || data.length === 0) break;
      const paths = data.map((entry) => `${userId}/${entry.name}`);
      await admin.storage.from(bucket).remove(paths);
      if (data.length < pageSize) break;
      offset += pageSize;
    }
  }
}

export async function POST() {
  const server = await createSupabaseServerClient();
  if (!server) {
    return NextResponse.json(
      { error: "Account deletion is unavailable in this environment." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: getUserError,
  } = await server.auth.getUser();

  if (getUserError || !user) {
    return NextResponse.json(
      { error: "Sign in to delete your account." },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is not configured for account deletion." },
      { status: 503 },
    );
  }

  // Storage objects don't cascade with auth.users — purge them explicitly.
  // DB rows for this user cascade automatically via FK on auth.users.
  try {
    await purgeUserStorage(admin, user.id);
  } catch {
    /* best effort — proceed to auth deletion regardless */
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Could not delete account. Please try again or email vxvo.admin@gmail.com." },
      { status: 500 },
    );
  }

  // Clear the user's session on this device so they can't keep using stale cookies.
  await server.auth.signOut();

  return NextResponse.json({ ok: true });
}
