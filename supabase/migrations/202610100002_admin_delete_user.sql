-- Allows admins to remove a login account from the admin workspace.
-- Existing tournament registrations remain in place.

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  remaining_admins integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  if target_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot remove your own account.';
  end if;

  select profiles.role
    into target_role
    from public.profiles
    where profiles.id = target_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'The account was not found.';
  end if;

  if target_role = 'admin' then
    select count(*)
      into remaining_admins
      from public.profiles
      where profiles.role = 'admin'
        and profiles.is_active = true
        and profiles.id <> target_user_id;

    if remaining_admins = 0 then
      raise exception using errcode = '42501', message = 'At least one active admin account must remain.';
    end if;
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
