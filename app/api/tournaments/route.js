import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    let { data, error } = await supabase
      .from("tournaments")
      .select("id, title, game_name, team_format, max_team_size, registration_status, location, starts_at, registration_closes_at, details")
      .order("title");

    // Keep the public tournament listing available while an existing deployment
    // is waiting for the accompanying migration to add the new event fields.
    if (error) {
      ({ data, error } = await supabase
        .from("tournaments")
        .select("id, title, game_name, team_format, max_team_size, registration_status")
        .order("title"));
    }
    if (error) throw error;
    return NextResponse.json({ tournaments: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load tournaments." },
      { status: 500 },
    );
  }
}
