import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth";

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
    return NextResponse.json({ admin: { id: user.id, email: user.email }, tournaments: tournaments.data, announcements: announcements.data, teams: teams.data, profiles: profiles.data, matches: matches.data });
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
      const payload = {
        title: text(tournament.title, 120), game_name: text(tournament.game_name, 80), team_format: text(tournament.team_format, 80),
        max_team_size: Math.min(Math.max(integer(tournament.max_team_size, 1), 1), 20), registration_status: text(tournament.registration_status, 30) || "Closed",
        location: text(tournament.location, 200) || null, starts_at: tournament.starts_at || null, registration_closes_at: tournament.registration_closes_at || null, details: text(tournament.details, 2000) || null,
      };
      if (!payload.title) return NextResponse.json({ error: "Tournament title is required." }, { status: 400 });
      const query = tournament.id ? supabase.from("tournaments").update(payload).eq("id", tournament.id) : supabase.from("tournaments").insert(payload);
      const { error } = await query;
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
      const payload = {
        tournament_id: text(match.tournament_id, 100), round_number: Math.max(integer(match.round_number, 1), 1), match_number: Math.max(integer(match.match_number, 1), 1),
        team_a_id: text(match.team_a_id, 100) || null, team_b_id: text(match.team_b_id, 100) || null, winner_id: text(match.winner_id, 100) || null,
        team_a_score: Math.max(integer(match.team_a_score), 0), team_b_score: Math.max(integer(match.team_b_score), 0), status: ["scheduled", "live", "complete"].includes(match.status) ? match.status : "scheduled", scheduled_at: match.scheduled_at || null,
      };
      const query = match.id ? supabase.from("tournament_matches").update(payload).eq("id", match.id) : supabase.from("tournament_matches").insert(payload);
      const { error } = await query;
      if (error) throw error;
    } else if (body.action === "saveProfile") {
      const profile = body.profile ?? {};
      const payload = { role: profile.role === "admin" ? "admin" : "student", is_active: Boolean(profile.is_active), display_name: text(profile.display_name, 100) || null };
      const { error } = await supabase.from("profiles").update(payload).eq("id", text(profile.id, 100));
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not save your changes." }, { status: 500 });
  }
}
