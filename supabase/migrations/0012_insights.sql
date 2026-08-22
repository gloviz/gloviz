-- Insight layer: precomputed records, correlations and a forecast ledger.
-- Populated by scripts/insights.ts nightly; read by /today, /forecasts,
-- /surprise and the explorer.

create table if not exists records (
  id          bigint generated always as identity primary key,
  series_id   bigint not null references series (id) on delete cascade,
  kind        text not null check (kind in ('high', 'low')),
  window_days integer not null,
  value       double precision not null,
  ts          timestamptz not null,
  detected_at timestamptz not null default now(),
  unique (series_id, kind, window_days)
);

create table if not exists correlations (
  id         bigint generated always as identity primary key,
  series_a   bigint not null references series (id) on delete cascade,
  series_b   bigint not null references series (id) on delete cascade,
  r          double precision not null,
  overlap    integer not null,
  cross_source boolean not null,
  computed_at timestamptz not null default now(),
  unique (series_a, series_b),
  check (series_a < series_b)
);

-- The ledger. One row per (who, which series, for when, said when).
-- error is filled in once the outcome exists; until then it is null.
create table if not exists forecasts (
  id            bigint generated always as identity primary key,
  series_id     bigint not null references series (id) on delete cascade,
  predictor     text not null,           -- 'source', 'baseline:naive', 'baseline:drift'
  predicted_for timestamptz not null,
  predicted_at  timestamptz not null default now(),
  value         double precision not null,
  actual        double precision,
  abs_error     double precision,
  scored_at     timestamptz,
  unique (series_id, predictor, predicted_for, predicted_at)
);

create index if not exists forecasts_unscored on forecasts (predicted_for) where actual is null;
create index if not exists correlations_strength on correlations (abs(r) desc);

alter table records enable row level security;
alter table correlations enable row level security;
alter table forecasts enable row level security;
create policy "public read" on records for select to anon using (true);
create policy "public read" on correlations for select to anon using (true);
create policy "public read" on forecasts for select to anon using (true);
