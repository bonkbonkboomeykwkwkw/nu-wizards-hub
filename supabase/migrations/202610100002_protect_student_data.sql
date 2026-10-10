-- Apply after the admin and registration migration. This removes public table
-- access to student personal information while keeping the public bracket and
-- registration-status pages working through narrowly scoped database functions.

alter table public.teams
  add column if not exists privacy_consent_at timestamptz;

create or replace function public.public_bracket_data()
returns table (
  id uuid,
  title text,
  game_name text,
  registration_status text,
  entrants jsonb,
  matches jsonb
)
language sql stable security definer set search_path = public as $$
  select
    tournament.id,
    tournament.title,
    tournament.game_name,
    tournament.registration_status,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', team.id, 'tournament_id', team.tournament_id, 'team_name', team.team_name) order by team.team_name)
      from public.teams team where team.tournament_id = tournament.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', match.id,
        'round_number', match.round_number,
        'match_number', match.match_number,
        'team_a_score', match.team_a_score,
        'team_b_score', match.team_b_score,
        'status', match.status,
        'scheduled_at', match.scheduled_at,
        'teamA', case when team_a.id is null then null else jsonb_build_object('id', team_a.id, 'tournament_id', team_a.tournament_id, 'team_name', team_a.team_name) end,
        'teamB', case when team_b.id is null then null else jsonb_build_object('id', team_b.id, 'tournament_id', team_b.tournament_id, 'team_name', team_b.team_name) end,
        'winner', case when winner.id is null then null else jsonb_build_object('id', winner.id, 'tournament_id', winner.tournament_id, 'team_name', winner.team_name) end
      ) order by match.round_number, match.match_number)
      from public.tournament_matches match
      left join public.teams team_a on team_a.id = match.team_a_id
      left join public.teams team_b on team_b.id = match.team_b_id
      left join public.teams winner on winner.id = match.winner_id
      where match.tournament_id = tournament.id
    ), '[]'::jsonb)
  from public.tournaments tournament
  order by tournament.title;
$$;

create or replace function public.find_registration(registration_id uuid)
returns table (team_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select team_name, created_at from public.teams where id = registration_id;
$$;

revoke all on function public.public_bracket_data() from public;
revoke all on function public.find_registration(uuid) from public;
grant execute on function public.public_bracket_data() to anon, authenticated;
grant execute on function public.find_registration(uuid) to anon, authenticated;

drop policy if exists "public reads teams" on public.teams;
drop policy if exists "public reads players" on public.players;
drop policy if exists "captains read own teams" on public.teams;
create policy "captains read own teams" on public.teams for select to authenticated
using (lower(captain_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "captains read own players" on public.players;
create policy "captains read own players" on public.players for select to authenticated
using (exists (
  select 1 from public.teams
  where teams.id = players.team_id
    and lower(teams.captain_email) = lower(auth.jwt() ->> 'email')
));
