-- The verified account email identifies a team captain and may register once.
alter table public.teams add column if not exists captain_email text;

create unique index if not exists teams_captain_email_unique
  on public.teams (lower(captain_email))
  where captain_email is not null;
