-- Apply this file in the Supabase SQL Editor before using the admin workspace.

alter table public.tournaments
  add column if not exists location text,
  add column if not exists starts_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists details text;

alter table public.teams
  add column if not exists facebook_url text,
  add column if not exists cor_path text,
  add column if not exists group_name text;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email)
select id, lower(email) from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  match_number integer not null check (match_number > 0),
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  winner_id uuid references public.teams(id) on delete set null,
  team_a_score integer not null default 0 check (team_a_score >= 0),
  team_b_score integer not null default 0 check (team_b_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'complete')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round_number, match_number)
);

insert into storage.buckets (id, name, public)
values ('cor-documents', 'cor-documents', false)
on conflict (id) do update set public = false;

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.announcements enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists "profiles own or admin" on public.profiles;
create policy "profiles own or admin" on public.profiles for select
using (id = auth.uid() or public.is_admin());
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads tournaments" on public.tournaments;
create policy "public reads tournaments" on public.tournaments for select using (true);
drop policy if exists "admins manage tournaments" on public.tournaments;
create policy "admins manage tournaments" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads announcements" on public.announcements;
create policy "public reads announcements" on public.announcements for select using (true);
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads teams" on public.teams;
create policy "public reads teams" on public.teams for select using (true);
drop policy if exists "captains add one team" on public.teams;
create policy "captains add one team" on public.teams for insert to authenticated with check (lower(captain_email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "admins manage teams" on public.teams;
create policy "admins manage teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads players" on public.players;
create policy "public reads players" on public.players for select using (true);
drop policy if exists "captains add players" on public.players;
create policy "captains add players" on public.players for insert to authenticated with check (
  exists (select 1 from public.teams where id = team_id and lower(captain_email) = lower(auth.jwt() ->> 'email'))
);
drop policy if exists "admins manage players" on public.players;
create policy "admins manage players" on public.players for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads matches" on public.tournament_matches;
create policy "public reads matches" on public.tournament_matches for select using (true);
drop policy if exists "admins manage matches" on public.tournament_matches;
create policy "admins manage matches" on public.tournament_matches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "students upload their COR" on storage.objects;
create policy "students upload their COR" on storage.objects for insert to authenticated with check (
  bucket_id = 'cor-documents' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "owners and admins view COR" on storage.objects;
create policy "owners and admins view COR" on storage.objects for select to authenticated using (
  bucket_id = 'cor-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
drop policy if exists "owners remove their COR" on storage.objects;
create policy "owners remove their COR" on storage.objects for delete to authenticated using (
  bucket_id = 'cor-documents' and (storage.foldername(name))[1] = auth.uid()::text
);

-- Run once, replacing the address with the first staff account that should administer the site.
-- update public.profiles set role = 'admin' where email = 'staff@national-u.edu.ph';
