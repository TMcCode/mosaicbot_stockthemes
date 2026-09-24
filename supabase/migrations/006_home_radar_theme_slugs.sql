-- Ordered theme slugs (≤6) shown as Narrative Radar home Watchlist cards.
alter table public.profiles
  add column if not exists home_radar_theme_slugs text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_home_radar_theme_slugs_max6;

alter table public.profiles
  add constraint profiles_home_radar_theme_slugs_max6
  check (cardinality(home_radar_theme_slugs) <= 6);

create or replace function public.profiles_normalize_home_radar_slugs()
returns trigger
language plpgsql
as $$
declare
  s text;
  out text[] := '{}';
begin
  foreach s in array coalesce(new.home_radar_theme_slugs, '{}') loop
    s := lower(trim(s));
    if s <> '' and not (s = any(out)) then
      out := array_append(out, s);
    end if;
  end loop;
  if cardinality(out) > 6 then
    out := out[1:6];
  end if;
  new.home_radar_theme_slugs := out;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_home_radar_slugs on public.profiles;
create trigger profiles_normalize_home_radar_slugs
  before insert or update of home_radar_theme_slugs on public.profiles
  for each row execute function public.profiles_normalize_home_radar_slugs();
