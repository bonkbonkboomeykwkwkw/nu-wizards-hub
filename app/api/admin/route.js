import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { validateScheduleDate } from "@/lib/schedule-validation";

const text = (value, maxLength = 500) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const integer = (value, fallback = 0) => Number.isInteger(Number(value)) ? Number(value) : fallback;

async function adminContext(request) {
  const context = await requireAdmin(request);
  if (context.error) return { response: NextResponse.json({ error: context.error }, { status: context.status }) };
  return { context };
}

export async function GET(request) {
  const result = await adminContext(request);
  if (result.response) return result.response;
  const { supabase, user } = result.context;

  try {
    const [tournaments, announcements, teams, profiles, matches] = await Promise.all([
      supabase.from("tournaments").select("id, title, game_name, team_format, max_team_size, registration_status, location, starts_at, registration_closes_at, details").order("title"),
      supabase.from("announcements").select("id, title, content, created_at").order("created_at", { ascending: false }),
      supabase.from("teams").select("id, tournament_id, team_name, captain_email, facebook_url, cor_path, group_name, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, display_name, role, is_active, created_at").order("created_at", { ascending: false }),
      supabase.from("tournament_matches").select("id, tournament_id, round_number, match_number, team_a_id, team_b_id, winner_id, team_a_score, team_b_score, status, scheduled_at").order("round_number").order("match_number"),
    ]);
    for (const query of [tournaments, announcements, teams, profiles, matches]) if (query.error) throw query.error;
    const tournamentById = new Map((tournaments.data ?? []).map((item) => [item.id, item]));
    const enrichedTeams = await Promise.all((teams.data ?? []).map(async (team) => {
      let corUrl = null;
      if (team.cor_path) {
        const { data: signedFile } = await supabase.storage.from("cor-documents").createSignedUrl(team.cor_path, 300);
        corUrl = signedFile?.signedUrl ?? null;
      }
      return { ...team, tournament_title: tournamentById.get(team.tournament_id)?.title ?? "Unknown event", cor_url: corUrl };
    }));
    return NextResponse.json({ admin: { id: user.id, email: user.email }, tournaments: tournaments.data, announcements: announcements.data, teams: enrichedTeams, profiles: profiles.data, matches: matches.data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not load the admin workspace." }, { status: 500 });
  }
}

export async function POST(request) {
  const result = await adminContext(request);
  if (result.response) return result.response;
  const { supabase } = result.context;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  try {
    if (body.action === "saveTournament") {
      const tournament = body.tournament ?? {};
      let previous;
      if (tournament.id) {
        const { data, error } = await supabase.from("tournaments").select("starts_at, registration_closes_at").eq("id", tournament.id).maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ error: "Tournament not found. Refresh the workspace and try again." }, { status: 404 });
        previous = data;
      }
      const now = Date.now();
      for (const [key, label] of [["starts_at", "Tournament start"], ["registration_closes_at", "Registration deadline"]]) {
        const error = validateScheduleDate(tournament[key], { previous: previous?.[key], label, now });
        if (error) return NextResponse.json({ error }, { status: 400 });
      }
      const payload = {
        title: text(tournament.title, 120), game_name: text(tournament.game_name, 80), team_format: text(tournament.team_format, 80),
        max_team_size: Math.min(Math.max(integer(tournament.max_team_size, 1), 1), 20), registration_status: text(tournament.registration_status, 30) || "Closed",
        location: text(tournament.location, 200) || null, starts_at: tournament.starts_at ? new Date(tournament.starts_at).toISOString() : null, registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString() : null, details: text(tournament.details, 2000) || null,
      };
      if (!payload.title) return NextResponse.json({ error: "Tournament title is required." }, { status: 400 });
      const query = tournament.id ? supabase.from("tournaments").update(payload).eq("id", tournament.id) : supabase.from("tournaments").insert(payload);
      const { error } = await query;
      if (error) throw error;
    } else if (body.action === "deleteTournament") {
      const tournamentId = text(body.id, 100);
      if (!tournamentId) return NextResponse.json({ error: "Choose a tournament to delete." }, { status: 400 });

      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", tournamentId);
      if (teamsError) throw teamsError;

      const teamIds = (teams ?? []).map((team) => team.id);
      if (teamIds.length) {
        const { error: playersError } = await supabase.from("players").delete().in("team_id", teamIds);
        if (playersError) throw playersError;
      }

      const { error: matchesError } = await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId);
      if (matchesError) throw matchesError;
      if (teamIds.length) {
        const { error: deleteTeamsError } = await supabase.from("teams").delete().in("id", teamIds);
        if (deleteTeamsError) throw deleteTeamsError;
      }

      const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
      if (error) throw error;
    } else if (body.action === "saveAnnouncement") {
      const announcement = body.announcement ?? {};
      const payload = { title: text(announcement.title, 160), content: text(announcement.content, 4000) };
      if (!payload.title || !payload.content) return NextResponse.json({ error: "Announcement title and content are required." }, { status: 400 });
      const query = announcement.id ? supabase.from("announcements").update(payload).eq("id", announcement.id) : supabase.from("announcements").insert(payload);
      const { error } = await query;
      if (error) throw error;
    } else if (body.action === "deleteAnnouncement") {
      const { error } = await supabase.from("announcements").delete().eq("id", text(body.id, 100));
      if (error) throw error;
    } else if (body.action === "setTeamGroup") {
      const { error } = await supabase.from("teams").update({ group_name: text(body.group_name, 80) || null }).eq("id", text(body.id, 100));
      if (error) throw error;
    } else if (body.action === "saveMatch") {
      const match = body.match ?? {};
      if (!text(match.tournament_id, 100)) return NextResponse.json({ error: "Choose a tournament for the match." }, { status: 400 });
      let previous;
      if (match.id) {
        const { data, error } = await supabase.from("tournament_matches").select("scheduled_at").eq("id", match.id).maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ error: "Match not found. Refresh the workspace and try again." }, { status: 404 });
        previous = data;
      }
      const dateError = validateScheduleDate(match.scheduled_at, { previous: previous?.scheduled_at, required: true, label: "Match date and time" });
      if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
      const scheduledAt = new Date(match.scheduled_at);
      if (match.team_a_id && match.team_a_id === match.team_b_id) {
        return NextResponse.json({ error: "A team cannot play against itself." }, { status: 400 });
      }
      if (match.winner_id && ![match.team_a_id, match.team_b_id].includes(match.winner_id)) {
        return NextResponse.json({ error: "The winner must be one of the match participants." }, { status: 400 });
      }
      const payload = {
        tournament_id: text(match.tournament_id, 100), round_number: Math.max(integer(match.round_number, 1), 1), match_number: Math.max(integer(match.match_number, 1), 1),
        team_a_id: text(match.team_a_id, 100) || null, team_b_id: text(match.team_b_id, 100) || null, winner_id: text(match.winner_id, 100) || null,
        team_a_score: Math.max(integer(match.team_a_score), 0), team_b_score: Math.max(integer(match.team_b_score), 0), status: ["scheduled", "live", "complete"].includes(match.status) ? match.status : "scheduled", scheduled_at: scheduledAt.toISOString(),
      };
      const query = match.id ? supabase.from("tournament_matches").update(payload).eq("id", match.id) : supabase.from("tournament_matches").insert(payload);
      const { error } = await query;
      if (error) throw error;
    } else if (body.action === "deleteMatch") {
      const { error } = await supabase.from("tournament_matches").delete().eq("id", text(body.id, 100));
      if (error) throw error;
    } else if (body.action === "saveProfile") {
      const profile = body.profile ?? {};
      const payload = { role: profile.role === "admin" ? "admin" : "student", is_active: Boolean(profile.is_active), display_name: text(profile.display_name, 100) || null };
      if (text(profile.id, 100) === result.context.user.id && (payload.role !== "admin" || !payload.is_active)) {
        return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
      }
      if (profile.role === "admin" && profile.is_active && (payload.role !== "admin" || !payload.is_active)) {
        const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
        if (countError) throw countError;
        if ((count ?? 0) <= 1) return NextResponse.json({ error: "At least one active administrator must remain." }, { status: 400 });
      }
      const { error } = await supabase.from("profiles").update(payload).eq("id", text(profile.id, 100));
      if (error) throw error;
    } else if (body.action === "deleteProfile") {
      const targetUserId = text(body.id, 100);
      if (!targetUserId) return NextResponse.json({ error: "Choose an account to remove." }, { status: 400 });
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: targetUserId });
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.code === "PGRST202" || String(error.message).includes("admin_delete_user")) {
      return NextResponse.json({ error: "Apply the latest Supabase migration to enable account removal." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || "Could not save your changes." }, { status: 500 });
  }
}
