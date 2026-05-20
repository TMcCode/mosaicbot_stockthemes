-- stockthemes.ai — profiles + watchlist (run in Supabase SQL Editor or via CLI)
-- Phase 1: auth users get a profile row; watchlist ready for Phase 2 CRUD.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  entitlement text not null default 'signed_in_free',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- watchlist_items
-- ---------------------------------------------------------------------------
create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('theme', 'ticker')),
  item_key text not null,
  sort_order int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_key)
);

create index if not exists watchlist_items_user_idx
  on public.watchlist_items (user_id, item_type, sort_order);

alter table public.watchlist_items enable row level security;

create policy "watchlist_select_own"
  on public.watchlist_items for select
  using (auth.uid() = user_id);

create policy "watchlist_insert_own"
  on public.watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "watchlist_update_own"
  on public.watchlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watchlist_delete_own"
  on public.watchlist_items for delete
  using (auth.uid() = user_id);

-- Normalize ticker symbols; theme slugs stored lowercase trimmed.
create or replace function public.watchlist_items_normalize_key()
returns trigger
language plpgsql
as $$
begin
  new.item_key := trim(new.item_key);
  if new.item_type = 'ticker' then
    new.item_key := upper(new.item_key);
  else
    new.item_key := lower(new.item_key);
  end if;
  return new;
end;
$$;

drop trigger if exists watchlist_items_normalize_key on public.watchlist_items;
create trigger watchlist_items_normalize_key
  before insert or update on public.watchlist_items
  for each row execute function public.watchlist_items_normalize_key();

-- Max 20 themes and 20 tickers per user.
create or replace function public.watchlist_items_enforce_limit()
returns trigger
language plpgsql
as $$
declare
  cnt int;
begin
  select count(*)::int into cnt
  from public.watchlist_items
  where user_id = new.user_id and item_type = new.item_type;
  if cnt >= 20 then
    raise exception 'watchlist limit reached (max 20 %)', new.item_type;
  end if;
  return new;
end;
$$;

drop trigger if exists watchlist_items_enforce_limit on public.watchlist_items;
create trigger watchlist_items_enforce_limit
  before insert on public.watchlist_items
  for each row execute function public.watchlist_items_enforce_limit();

-- ---------------------------------------------------------------------------
-- profile row on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
