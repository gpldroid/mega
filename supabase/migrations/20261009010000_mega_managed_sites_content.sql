-- Multi-site website management and editable content for MEGA Control Center.
create table if not exists public.managed_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  site_url text,
  description text not null default '',
  framework text not null default 'static',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists managed_sites_user_updated_idx on public.managed_sites(user_id, updated_at desc);
create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.managed_sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, slug)
);
create index if not exists site_pages_site_updated_idx on public.site_pages(site_id, updated_at desc);
alter table public.managed_sites enable row level security;
alter table public.site_pages enable row level security;
drop policy if exists managed_sites_select_owner_admin on public.managed_sites;
create policy managed_sites_select_owner_admin on public.managed_sites for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists managed_sites_insert_owner on public.managed_sites;
create policy managed_sites_insert_owner on public.managed_sites for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists managed_sites_update_owner_admin on public.managed_sites;
create policy managed_sites_update_owner_admin on public.managed_sites for update to authenticated using (user_id = (select auth.uid()) or public.is_admin()) with check (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists managed_sites_delete_owner_admin on public.managed_sites;
create policy managed_sites_delete_owner_admin on public.managed_sites for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists site_pages_select_owner_admin on public.site_pages;
create policy site_pages_select_owner_admin on public.site_pages for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists site_pages_insert_owner on public.site_pages;
create policy site_pages_insert_owner on public.site_pages for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.managed_sites s where s.id = site_id and s.user_id = (select auth.uid())));
drop policy if exists site_pages_update_owner_admin on public.site_pages;
create policy site_pages_update_owner_admin on public.site_pages for update to authenticated using (user_id = (select auth.uid()) or public.is_admin()) with check ((user_id = (select auth.uid()) and exists (select 1 from public.managed_sites s where s.id = site_id and s.user_id = (select auth.uid()))) or public.is_admin());
drop policy if exists site_pages_delete_owner_admin on public.site_pages;
create policy site_pages_delete_owner_admin on public.site_pages for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin());
grant select, insert, update, delete on public.managed_sites to authenticated;
grant select, insert, update, delete on public.site_pages to authenticated;
