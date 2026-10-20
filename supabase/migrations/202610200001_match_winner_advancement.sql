-- Atomic winner advancement for single-elimination tournament brackets.
-- Apply this migration in Supabase before deploying the matching application code.

create or replace function public.admin_set_next_match_slot(
  p_tournament_id uuid,
  p_source_round integer,
  p_source_match integer,
  p_old_winner_id uuid,
  p_new_winner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_round integer := p_source_round + 1;
  next_match integer := (p_source_match + 1) / 2;
  next_slot text := case when p_source_match % 2 = 1 then 'team_a_id' else 'team_b_id' end;
  next_row public.tournament_matches%rowtype;
  current_team_id uuid;
  previous_next_winner uuid;
  entrant_count integer;
  final_round integer := 0;
begin
  select count(*) into entrant_count from public.teams where tournament_id = p_tournament_id;
  while entrant_count > 1 loop
    final_round := final_round + 1;
    entrant_count := (entrant_count + 1) / 2;
  end loop;
  if p_source_round >= final_round and p_new_winner_id is not null then
    return;
  end if;

  select * into next_row
  from public.tournament_matches
  where tournament_id = p_tournament_id
    and round_number = next_round
    and match_number = next_match
  for update;

  if not found then
    if p_new_winner_id is null then
      return;
    end if;

    insert into public.tournament_matches (
      tournament_id, round_number, match_number, team_a_id, team_b_id,
      team_a_score, team_b_score, status, scheduled_at
    ) values (
      p_tournament_id, next_round, next_match,
      case when next_slot = 'team_a_id' then p_new_winner_id else null end,
      case when next_slot = 'team_b_id' then p_new_winner_id else null end,
      0, 0, 'scheduled', null
    )
    on conflict (tournament_id, round_number, match_number) do nothing;

    select * into next_row
    from public.tournament_matches
    where tournament_id = p_tournament_id
      and round_number = next_round
      and match_number = next_match
    for update;
  end if;

  if next_slot = 'team_a_id' then
    current_team_id := next_row.team_a_id;
  else
    current_team_id := next_row.team_b_id;
  end if;

  if current_team_id is distinct from p_new_winner_id then
    if current_team_id is not null
      and current_team_id is distinct from p_old_winner_id
      and current_team_id is distinct from p_new_winner_id then
      raise exception using
        errcode = '23514',
        message = format('Round %s, match %s has a manually assigned team in the advancing slot. Clear or correct that slot before saving this result.', next_round, next_match);
    end if;

    previous_next_winner := next_row.winner_id;

    update public.tournament_matches
    set team_a_id = case when next_slot = 'team_a_id' then p_new_winner_id else team_a_id end,
        team_b_id = case when next_slot = 'team_b_id' then p_new_winner_id else team_b_id end,
        winner_id = null,
        team_a_score = 0,
        team_b_score = 0,
        status = 'scheduled',
        updated_at = now()
    where id = next_row.id;

    -- A changed participant invalidates this match's result and any downstream
    -- advancement that came from it. Rewind that result recursively.
    if previous_next_winner is not null then
      perform public.admin_set_next_match_slot(
        p_tournament_id, next_round, next_match, previous_next_winner, null
      );
    end if;
  end if;
end;
$$;

create or replace function public.admin_save_match_and_advance(
  p_match_id uuid,
  p_tournament_id uuid,
  p_round_number integer,
  p_match_number integer,
  p_team_a_id uuid,
  p_team_b_id uuid,
  p_winner_id uuid,
  p_team_a_score integer,
  p_team_b_score integer,
  p_status text,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_match public.tournament_matches%rowtype;
  previous_winner uuid;
  changed boolean;
  advancement jsonb;
  entrant_count integer;
  final_round integer := 0;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;
  if p_tournament_id is null or p_round_number < 1 or p_round_number > 64 or p_match_number < 1 then
    raise exception using errcode = '22023', message = 'Choose a valid tournament, round, and match number.';
  end if;
  if p_status not in ('scheduled', 'live', 'complete') then
    raise exception using errcode = '22023', message = 'Choose a valid match status.';
  end if;
  if p_team_a_id is not null and p_team_a_id = p_team_b_id then
    raise exception using errcode = '22023', message = 'A team cannot play against itself.';
  end if;
  if p_winner_id is not null and (p_status <> 'complete' or (p_winner_id is distinct from p_team_a_id and p_winner_id is distinct from p_team_b_id)) then
    raise exception using errcode = '22023', message = 'A completed match winner must be one of its participants.';
  end if;
  if p_status = 'complete' and p_winner_id is null then
    raise exception using errcode = '22023', message = 'Choose a winner before completing the match.';
  end if;
  if (p_team_a_id is not null and not exists (select 1 from public.teams where id = p_team_a_id and tournament_id = p_tournament_id))
    or (p_team_b_id is not null and not exists (select 1 from public.teams where id = p_team_b_id and tournament_id = p_tournament_id)) then
    raise exception using errcode = '22023', message = 'Both participants must belong to this tournament.';
  end if;
  if p_team_a_score < 0 or p_team_b_score < 0 then
    raise exception using errcode = '22023', message = 'Match scores cannot be negative.';
  end if;

  select count(*) into entrant_count from public.teams where tournament_id = p_tournament_id;
  while entrant_count > 1 loop
    final_round := final_round + 1;
    entrant_count := (entrant_count + 1) / 2;
  end loop;
  -- Serialize edits to this bracket position, including first-time inserts.
  perform pg_advisory_xact_lock(hashtextextended(
    p_tournament_id::text || ':' || p_round_number::text || ':' || p_match_number::text, 0
  ));

  if p_match_id is not null then
    select * into saved_match
    from public.tournament_matches
    where id = p_match_id
    for update;
    if not found or saved_match.tournament_id <> p_tournament_id then
      raise exception using errcode = '22023', message = 'The selected match was not found in this tournament.';
    end if;
    if saved_match.round_number <> p_round_number or saved_match.match_number <> p_match_number then
      raise exception using errcode = '22023', message = 'A saved match cannot be moved to another bracket position. Delete it and create it at the new position.';
    end if;
    if (saved_match.team_a_id is distinct from p_team_a_id or saved_match.team_b_id is distinct from p_team_b_id)
      and saved_match.winner_id is not null
      and p_winner_id is not null then
      raise exception using errcode = '22023', message = 'Changing participants clears the previous result. Save the matchup first, then record its winner.';
    end if;
    previous_winner := saved_match.winner_id;
    update public.tournament_matches
    set team_a_id = p_team_a_id,
        team_b_id = p_team_b_id,
        winner_id = p_winner_id,
        team_a_score = p_team_a_score,
        team_b_score = p_team_b_score,
        status = p_status,
        scheduled_at = p_scheduled_at,
        updated_at = now()
    where id = p_match_id
    returning * into saved_match;
  else
    select * into saved_match
    from public.tournament_matches
    where tournament_id = p_tournament_id
      and round_number = p_round_number
      and match_number = p_match_number
    for update;
    if found then
      previous_winner := saved_match.winner_id;
      if (saved_match.team_a_id is distinct from p_team_a_id or saved_match.team_b_id is distinct from p_team_b_id)
        and saved_match.winner_id is not null
        and p_winner_id is not null then
        raise exception using errcode = '22023', message = 'Changing participants clears the previous result. Save the matchup first, then record its winner.';
      end if;
      update public.tournament_matches
      set team_a_id = p_team_a_id,
          team_b_id = p_team_b_id,
          winner_id = p_winner_id,
          team_a_score = p_team_a_score,
          team_b_score = p_team_b_score,
          status = p_status,
          scheduled_at = p_scheduled_at,
          updated_at = now()
      where id = saved_match.id
      returning * into saved_match;
    else
      insert into public.tournament_matches (
        tournament_id, round_number, match_number, team_a_id, team_b_id,
        winner_id, team_a_score, team_b_score, status, scheduled_at
      ) values (
        p_tournament_id, p_round_number, p_match_number, p_team_a_id, p_team_b_id,
        p_winner_id, p_team_a_score, p_team_b_score, p_status, p_scheduled_at
      ) returning * into saved_match;
      previous_winner := null;
    end if;
  end if;

  changed := previous_winner is distinct from p_winner_id;
  if changed or p_winner_id is not null then
    perform public.admin_set_next_match_slot(
      p_tournament_id, p_round_number, p_match_number, previous_winner, p_winner_id
    );
  end if;

  if p_winner_id is null then
    advancement := jsonb_build_object('advanced', false);
  elsif changed and p_round_number < final_round then
    advancement := jsonb_build_object(
      'advanced', true,
      'round_number', p_round_number + 1,
      'match_number', (p_match_number + 1) / 2,
      'slot', case when p_match_number % 2 = 1 then 'team_a' else 'team_b' end
    );
  elsif p_winner_id is not null and p_round_number >= final_round then
    advancement := jsonb_build_object('advanced', false, 'champion', true);
  else
    advancement := jsonb_build_object('advanced', false, 'already_recorded', true);
  end if;

  return advancement;
end;
$$;

create or replace function public.admin_delete_match_and_rewind(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_match public.tournament_matches%rowtype;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;
  select * into deleted_match
  from public.tournament_matches
  where id = p_match_id
  for update;
  if not found then
    return;
  end if;

  delete from public.tournament_matches where id = p_match_id;
  if deleted_match.winner_id is not null then
    perform public.admin_set_next_match_slot(
      deleted_match.tournament_id,
      deleted_match.round_number,
      deleted_match.match_number,
      deleted_match.winner_id,
      null
    );
  end if;
end;
$$;

revoke all on function public.admin_set_next_match_slot(uuid, integer, integer, uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_save_match_and_advance(uuid, uuid, integer, integer, uuid, uuid, uuid, integer, integer, text, timestamptz) from public, anon;
revoke all on function public.admin_delete_match_and_rewind(uuid) from public, anon;
grant execute on function public.admin_save_match_and_advance(uuid, uuid, integer, integer, uuid, uuid, uuid, integer, integer, text, timestamptz) to authenticated;
grant execute on function public.admin_delete_match_and_rewind(uuid) to authenticated;
