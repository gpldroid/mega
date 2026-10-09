-- MEGA initial schema. Applied to Supabase project upajzbaeuwzbhxfebzvi.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, display_name text, role text not null default 'user' check (role in ('user','admin')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 website_url text not null,
 package_name text not null check (package_name ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
 icon_url text, splash_color text not null default '#111827',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.builds (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','building','completed','failed')),
 github_run_id bigint, apk_url text, aab_url text, source_zip_url text, logs text, error_message text,
 requested_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz
);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists builds_project_id_idx on public.builds(project_id);
create index if not exists builds_user_requested_idx on public.builds(user_id, requested_at desc);
create index if not exists builds_status_idx on public.builds(status);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email,display_name)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'))
 on conflict(id) do update set email=excluded.email;
 return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.builds enable row level security;
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()) and role=(select role from public.profiles where id=(select auth.uid())));
drop policy if exists projects_select_owner_or_admin on public.projects;
create policy projects_select_owner_or_admin on public.projects for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());
drop policy if exists projects_insert_owner on public.projects;
create policy projects_insert_owner on public.projects for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists projects_update_owner_or_admin on public.projects;
create policy projects_update_owner_or_admin on public.projects for update to authenticated using (user_id=(select auth.uid()) or public.is_admin()) with check (user_id=(select auth.uid()) or public.is_admin());
drop policy if exists projects_delete_owner_or_admin on public.projects;
create policy projects_delete_owner_or_admin on public.projects for delete to authenticated using (user_id=(select auth.uid()) or public.is_admin());
drop policy if exists builds_select_owner_or_admin on public.builds;
create policy builds_select_owner_or_admin on public.builds for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());
grant select,insert,update,delete on public.projects to authenticated;
grant select on public.builds to authenticated;
grant select,update on public.profiles to authenticated;
