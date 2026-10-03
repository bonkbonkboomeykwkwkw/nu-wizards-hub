import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const [{ data: tournaments, error: tournamentError }, { data: teams, error: teamsError }] = await Promise.all([
      supabase.from("tournaments").select("id, title, game_name, registration_status").order("title"),
      supabase.from("teams").select("id, tournament_id, team_name").order("team_name"),
    ]);
    if (tournamentError) throw tournamentError;
    if (teamsError) throw teamsError;
    const brackets = (tournaments ?? []).map((tournament) => {
      const entrants = (teams ?? []).filter((team) => team.tournament_id === tournament.id);
      const matches = [];
      for (let i = 0; i < entrants.length; i += 2) {
        matches.push({ id: `1-${i / 2}`, teamA: entrants[i], teamB: entrants[i + 1] ?? null, bye: !entrants[i + 1] });
      }
      const rounds = matches.length ? [{ round: 1, matches }] : [];
      return { ...tournament, entrants, rounds };
    });
    return NextResponse.json({ brackets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load brackets." }, { status: 500 });
  }
}
