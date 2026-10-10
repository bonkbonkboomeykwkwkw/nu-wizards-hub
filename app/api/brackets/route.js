import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const [{ data: tournaments, error: tournamentError }, { data: teams, error: teamsError }, { data: savedMatches, error: matchesError }] = await Promise.all([
      supabase.from("tournaments").select("id, title, game_name, registration_status").order("title"),
      supabase.from("teams").select("id, tournament_id, team_name").order("team_name"),
      supabase.from("tournament_matches").select("id, tournament_id, round_number, match_number, team_a_id, team_b_id, winner_id, team_a_score, team_b_score, status, scheduled_at").order("round_number").order("match_number"),
    ]);
    if (tournamentError) throw tournamentError;
    if (teamsError) throw teamsError;
    // The saved-match table is created by the admin migration. Until it is
    // applied, retain the original generated first-round bracket.
    if (matchesError && matchesError.code !== "PGRST205" && matchesError.code !== "42P01") throw matchesError;
    const brackets = (tournaments ?? []).map((tournament) => {
      const entrants = (teams ?? []).filter((team) => team.tournament_id === tournament.id);
      const teamById = new Map(entrants.map((team) => [team.id, team]));
      const configuredMatches = (matchesError ? [] : savedMatches ?? []).filter((match) => match.tournament_id === tournament.id);
      const matches = configuredMatches.length ? configuredMatches.map((match) => ({
        ...match, teamA: teamById.get(match.team_a_id) ?? null, teamB: teamById.get(match.team_b_id) ?? null,
        winner: teamById.get(match.winner_id) ?? null, bye: !match.team_b_id,
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
