import { createClient } from "@supabase/supabase-js";

function getAccessToken(request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

export function getSupabaseUserClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return { error: "Log in to continue.", status: 401 };

  const supabase = getSupabaseUserClient(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) {
    return { error: "Confirm your email and log in to continue.", status: 401 };
  }
  return { supabase, user: data.user };
}

export async function requireAdmin(request) {
  const identity = await requireUser(request);
  if (identity.error) return identity;

  const { data: profile, error } = await identity.supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", identity.user.id)
    .maybeSingle();
  if (error) return { error: "Admin access is not configured. Apply the database migration first.", status: 503 };
  if (!profile?.is_active || profile.role !== "admin") {
    return { error: "Administrator access is required.", status: 403 };
  }
  return { ...identity, profile };
}
