-- Stock Context read markers (same Supabase project as stockthemes.ai)
-- Canonical copy also in mosaicbot_stockcontext/supabase/migrations/001_page_reads.sql

create table if not exists public.page_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_type text not null check (page_type in ('theme', 'ticker')),
  page_key text not null,
  seen_build_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, page_type, page_key)
);

create index if not exists page_reads_user_idx on public.page_reads (user_id);

alter table public.page_reads enable row level security;

create policy "page_reads_select_own"
  on public.page_reads for select
  using (auth.uid() = user_id);

create policy "page_reads_insert_own"
  on public.page_reads for insert
  with check (auth.uid() = user_id);

create policy "page_reads_update_own"
  on public.page_reads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "page_reads_delete_own"
  on public.page_reads for delete
  using (auth.uid() = user_id);

create or replace function public.page_reads_normalize_key()
returns trigger
language plpgsql
as $$
begin
  new.page_key := trim(new.page_key);
  if new.page_type = 'ticker' then
    new.page_key := upper(new.page_key);
  else
    new.page_key := lower(new.page_key);
  end if;
  return new;
end;
$$;

drop trigger if exists page_reads_normalize_key on public.page_reads;
create trigger page_reads_normalize_key
  before insert or update on public.page_reads
  for each row execute function public.page_reads_normalize_key();
