import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the registration ID from your receipt." }, { status: 400 });
  }

  const registrationId = typeof body?.registrationId === "string" ? body.registrationId.trim() : "";
  if (!UUID_PATTERN.test(registrationId)) {
    return NextResponse.json({ error: "That does not look like a valid registration ID." }, { status: 400 });
  }

  try {
    const { data: team, error } = await getSupabaseServerClient()
      .from("teams")
      .select("id, team_name, created_at")
      .eq("id", registrationId)
      .maybeSingle();

    if (error) throw error;
    if (!team) return NextResponse.json({ registered: false });

    return NextResponse.json({
      registered: true,
      teamName: team.team_name,
      registeredAt: team.created_at,
    });
  } catch (error) {
    console.error("Registration lookup failed:", error);
    return NextResponse.json({ error: "We could not check that ID right now. Please try again shortly." }, { status: 500 });
  }
}
