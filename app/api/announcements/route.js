import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ announcements: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load announcements." },
      { status: 500 },
    );
  }
}
