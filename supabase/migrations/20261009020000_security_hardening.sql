-- Harden profile updates: a signed-in user may edit display_name only.
-- The table-level UPDATE grant previously allowed attempts to alter role/email,
-- and the prior policy queried profiles from its own policy expression.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;
