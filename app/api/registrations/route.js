import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const isNonEmptyString = (value, maxLength) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

export async function POST(request) {
  try {
    const body = await request.json();
    const { tournamentId, teamName, players } = body ?? {};

    if (!isNonEmptyString(tournamentId, 100) || !isNonEmptyString(teamName, 80)) {
      return NextResponse.json({ error: "A valid tournament and team name are required." }, { status: 400 });
    }
    if (!Array.isArray(players) || players.length < 1 || players.length > 5) {
      return NextResponse.json({ error: "Provide a valid roster of 1 to 5 players." }, { status: 400 });
    }
    const cleanPlayers = players.map((player) => ({
      full_name: typeof player?.full_name === "string" ? player.full_name.trim() : "",
      student_id: typeof player?.student_id === "string" ? player.student_id.trim() : "",
      ign: typeof player?.ign === "string" ? player.ign.trim() : "",
    }));
    if (cleanPlayers.some((player) =>
      !isNonEmptyString(player.full_name, 120) ||
      !isNonEmptyString(player.student_id, 50) ||
      !isNonEmptyString(player.ign, 50)
    )) {
      return NextResponse.json({ error: "Complete all player fields with valid values." }, { status: 400 });
    }
    if (new Set(cleanPlayers.map((player) => player.student_id.toLowerCase())).size !== cleanPlayers.length) {
      return NextResponse.json({ error: "Each player must have a different Student ID." }, { status: 400 });
    }

    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Log in with a confirmed captain email to register." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const captainEmail = authData?.user?.email?.trim().toLowerCase();
    if (authError || !captainEmail || !authData.user.email_confirmed_at) {
      return NextResponse.json({ error: "Confirm your email and log in before registering." }, { status: 401 });
    }

    const { data: existingTeam, error: duplicateError } = await supabase
      .from("teams")
      .select("id")
      .eq("captain_email", captainEmail)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (existingTeam) return NextResponse.json({ error: "This captain email has already been used for a team registration." }, { status: 409 });
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, max_team_size, registration_status")
      .eq("id", tournamentId.trim())
      .single();
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "The selected tournament was not found." }, { status: 404 });
    }
    const isOpen = ["open", "active", "true"].includes(
      String(tournament.registration_status ?? "").toLowerCase(),
    );
    if (!isOpen) {
      return NextResponse.json({ error: "Registration is closed for this tournament." }, { status: 400 });
    }
    if (cleanPlayers.length > Number(tournament.max_team_size)) {
      return NextResponse.json({ error: "The roster exceeds this tournament's team size limit." }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ tournament_id: tournament.id, team_name: teamName.trim(), captain_email: captainEmail })
      .select("id, team_name")
      .single();
    if (teamError) throw teamError;

    for (const [index, player] of cleanPlayers.entries()) {
      const { error } = await supabase.from("players").insert({
        team_id: team.id,
        ...player,
        is_captain: index === 0,
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, teamId: team.id, teamName: team.team_name, captainEmail, tournament: tournament.id, registeredAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    const message =
      error && typeof error === "object" && typeof error.message === "string"
        ? error.message
        : "Registration failed due to a database or server error.";
    return NextResponse.json(
      { error: message, code: error?.code ?? null },
      { status: 500 },
    );
  }
}
