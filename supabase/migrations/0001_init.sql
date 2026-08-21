-- GLOVIZ schema. See docs/03-architecture.md.

create table if not exists sources (
  id          text primary key,
  name        text not null,
  homepage    text not null,
  license     text not null,
  attribution text not null,
  tier        smallint not null check (tier in (1, 2, 3))
);

create table if not exists series (
  id          bigint generated always as identity primary key,
  source_id   text not null references sources (id),
  external_id text not null,
  title       text not null,
  domain      text not null,
  geo_code    text not null,
  unit        text not null,
  frequency   text not null,
  metadata    jsonb not null default '{}',
  unique (source_id, external_id)
);

create table if not exists observations (
  series_id bigint not null references series (id),
  ts        timestamptz not null,
  value     double precision,
  primary key (series_id, ts)
);

create index if not exists observations_ts_brin on observations using brin (ts);

create table if not exists ingestion_runs (
  id          bigint generated always as identity primary key,
  source_id   text not null references sources (id),
  job         text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running'
              check (status in ('running', 'success', 'partial', 'error')),
  rows_written integer not null default 0,
  duration_ms  integer,
  error        text
);

create or replace view series_freshness as
select s.id as series_id, s.source_id, s.title, s.geo_code,
       max(o.ts) as latest_ts, count(o.*) as observation_count
from series s
left join observations o on o.series_id = s.id
group by s.id;

create or replace function prune_observations(keep interval)
returns bigint language sql as $$
  with deleted as (
    delete from observations where ts < now() - keep returning 1
  )
  select count(*) from deleted;
$$;

-- RLS: public read-only. Writes use the service-role key (bypasses RLS).
alter table sources enable row level security;
alter table series enable row level security;
alter table observations enable row level security;
alter table ingestion_runs enable row level security;

create policy "public read" on sources for select to anon using (true);
create policy "public read" on series for select to anon using (true);
create policy "public read" on observations for select to anon using (true);
create policy "public read" on ingestion_runs for select to anon using (true);
