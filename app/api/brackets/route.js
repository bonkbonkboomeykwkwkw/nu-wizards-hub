import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    let publicData;
    const { data, error: publicError } = await supabase.rpc("public_bracket_data");
    if (publicError?.code === "PGRST202" || publicError?.code === "42883") {
      const [{ data: tournaments, error: tournamentError }, { data: teams, error: teamsError }, { data: savedMatches, error: matchesError }] = await Promise.all([
        supabase.from("tournaments").select("id, title, game_name, registration_status").order("title"),
        supabase.from("teams").select("id, tournament_id, team_name").order("team_name"),
        supabase.from("tournament_matches").select("id, tournament_id, round_number, match_number, team_a_id, team_b_id, winner_id, team_a_score, team_b_score, status, scheduled_at").order("round_number").order("match_number"),
      ]);
      if (tournamentError) throw tournamentError;
      if (teamsError) throw teamsError;
      if (matchesError && matchesError.code !== "PGRST205" && matchesError.code !== "42P01") throw matchesError;
      publicData = (tournaments ?? []).map((tournament) => ({
        ...tournament,
        entrants: (teams ?? []).filter((team) => team.tournament_id === tournament.id),
        matches: matchesError ? [] : (savedMatches ?? []).filter((match) => match.tournament_id === tournament.id).map((match) => ({
          ...match,
          teamA: (teams ?? []).find((team) => team.id === match.team_a_id) ?? null,
          teamB: (teams ?? []).find((team) => team.id === match.team_b_id) ?? null,
          winner: (teams ?? []).find((team) => team.id === match.winner_id) ?? null,
        })),
      }));
    } else if (publicError) {
      throw publicError;
    } else {
      publicData = data;
    }
    const brackets = (publicData ?? []).map((tournament) => {
      const entrants = tournament.entrants ?? [];
      const configuredMatches = tournament.matches ?? [];
      const matches = configuredMatches.length ? configuredMatches.map((match) => ({
        ...match, bye: !match.teamB,
      })) : entrants.reduce((items, team, index) => {
        if (index % 2 === 0) items.push({ id: `1-${index / 2}`, teamA: team, teamB: entrants[index + 1] ?? null, bye: !entrants[index + 1], status: "scheduled", team_a_score: 0, team_b_score: 0 });
        return items;
      }, []);
      const rounds = matches.length ? Object.values(matches.reduce((groups, match) => {
        const round = match.round_number ?? 1; groups[round] ??= { round, matches: [] }; groups[round].matches.push(match); return groups;
      }, {})) : [];
      return { ...tournament, entrants, rounds };
    });
    return NextResponse.json({ brackets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load brackets." }, { status: 500 });
  }
}
