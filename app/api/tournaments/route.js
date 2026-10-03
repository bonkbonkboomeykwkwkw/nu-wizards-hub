import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, game_name, team_format, max_team_size, registration_status")
      .order("title");

    if (error) throw error;
    return NextResponse.json({ tournaments: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load tournaments." },
      { status: 500 },
    );
  }
}
