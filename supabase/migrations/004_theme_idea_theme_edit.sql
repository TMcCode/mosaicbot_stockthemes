-- Edit suggestions: remove tickers and/or propose weight changes for an existing theme.

alter table public.theme_idea_submissions
  drop constraint if exists theme_idea_submissions_new_group_fields,
  drop constraint if exists theme_idea_submissions_theme_in_group_fields;

alter table public.theme_idea_submissions
  drop constraint if exists theme_idea_submissions_kind_check;

alter table public.theme_idea_submissions
  add column if not exists theme_slug text,
  add column if not exists tickers_to_remove text[],
  add column if not exists weight_changes text;

alter table public.theme_idea_submissions
  add constraint theme_idea_submissions_kind_check
  check (kind in ('new_group', 'theme_in_group', 'theme_edit'));

alter table public.theme_idea_submissions
  add constraint theme_idea_submissions_new_group_fields check (
    kind <> 'new_group'
    or (
      proposed_group_name is not null
      and theme_names is not null
      and cardinality(theme_names) >= 2
      and group_note is not null
    )
  );

alter table public.theme_idea_submissions
  add constraint theme_idea_submissions_theme_in_group_fields check (
    kind <> 'theme_in_group'
    or (
      group_slug is not null
      and group_name is not null
      and proposed_theme_name is not null
      and tickers is not null
      and cardinality(tickers) >= 6
      and theme_reasoning is not null
    )
  );

alter table public.theme_idea_submissions
  add constraint theme_idea_submissions_theme_edit_fields check (
    kind <> 'theme_edit'
    or (
      theme_slug is not null
      and proposed_theme_name is not null
      and theme_reasoning is not null
      and (
        (tickers_to_remove is not null and cardinality(tickers_to_remove) >= 1)
        or (weight_changes is not null and length(trim(weight_changes)) >= 5)
      )
    )
  );
