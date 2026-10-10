import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";

const isNonEmptyString = (value, maxLength) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

function validFacebookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com"));
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { tournamentId, teamName, players, facebookUrl, corPath, privacyConsent } = body ?? {};

    if (!isNonEmptyString(tournamentId, 100) || !isNonEmptyString(teamName, 80)) {
      return NextResponse.json({ error: "A valid tournament and team name are required." }, { status: 400 });
    }
    if (!Array.isArray(players) || players.length < 1 || players.length > 5) {
      return NextResponse.json({ error: "Provide a valid roster of 1 to 5 players." }, { status: 400 });
    }
    if (!validFacebookUrl(facebookUrl)) {
      return NextResponse.json({ error: "Enter a valid HTTPS Facebook profile link." }, { status: 400 });
    }
    if (privacyConsent !== true) {
      return NextResponse.json({ error: "You must accept the registration data notice." }, { status: 400 });
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

    const identity = await requireUser(request);
    if (identity.error) return NextResponse.json({ error: identity.error }, { status: identity.status });
    const { supabase, user } = identity;
    const captainEmail = user.email?.trim().toLowerCase();
    if (!captainEmail) return NextResponse.json({ error: "A confirmed email address is required." }, { status: 401 });
    if (!isNonEmptyString(corPath, 500) || !corPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Upload your Certificate of Registration before submitting." }, { status: 400 });
    }

    const { data: existingTeam, error: duplicateError } = await supabase
      .from("teams")
      .select("id")
      .eq("captain_email", captainEmail)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (existingTeam) return NextResponse.json({ error: "This captain email has already been used for a team registration." }, { status: 409 });
    const { data: tournament, error: tournamentError } = await getSupabaseServerClient()
      .from("tournaments")
      .select("id, title, game_name, max_team_size, registration_status, registration_closes_at")
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
    if (tournament.registration_closes_at && new Date(tournament.registration_closes_at) <= new Date()) {
      return NextResponse.json({ error: "Registration has closed for this tournament." }, { status: 400 });
    }
    if (cleanPlayers.length > Number(tournament.max_team_size)) {
      return NextResponse.json({ error: "The roster exceeds this tournament's team size limit." }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        tournament_id: tournament.id,
        team_name: teamName.trim(),
        captain_email: captainEmail,
        facebook_url: facebookUrl.trim(),
        cor_path: corPath,
        privacy_consent_at: new Date().toISOString(),
      })
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

    const registeredAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      teamId: team.id,
      teamName: team.team_name,
      captainEmail,
      tournament: tournament.id,
      registeredAt,
    }, { status: 201 });
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
