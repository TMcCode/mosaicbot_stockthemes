-- Theme / group suggestions from signed-in users (/account/suggest).
-- Email still goes via FormSubmit; this table is the ledger for contributor rewards.
-- Admins update status + published_* slugs in Supabase Dashboard (service role).

create table if not exists public.theme_idea_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('new_group', 'theme_in_group')),
  submitter_email text not null,
  -- new_group
  proposed_group_name text,
  theme_names text[],
  group_note text,
  -- theme_in_group
  group_slug text,
  group_name text,
  proposed_theme_name text,
  tickers text[],
  theme_reasoning text,
  -- workflow (admins only — no client UPDATE policy)
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'accepted', 'rejected', 'duplicate')),
  review_notes text,
  published_theme_slug text,
  published_group_slug text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint theme_idea_submissions_new_group_fields check (
    kind <> 'new_group'
    or (
      proposed_group_name is not null
      and theme_names is not null
      and cardinality(theme_names) >= 2
      and group_note is not null
    )
  ),
  constraint theme_idea_submissions_theme_in_group_fields check (
    kind <> 'theme_in_group'
    or (
      group_slug is not null
      and group_name is not null
      and proposed_theme_name is not null
      and tickers is not null
      and cardinality(tickers) >= 6
      and theme_reasoning is not null
    )
  )
);

create index if not exists theme_idea_submissions_user_created_idx
  on public.theme_idea_submissions (user_id, created_at desc);

create index if not exists theme_idea_submissions_status_idx
  on public.theme_idea_submissions (status, created_at desc);

alter table public.theme_idea_submissions enable row level security;

create policy "theme_idea_submissions_select_own"
  on public.theme_idea_submissions for select
  using (auth.uid() = user_id);

create policy "theme_idea_submissions_insert_own"
  on public.theme_idea_submissions for insert
  with check (auth.uid() = user_id);
