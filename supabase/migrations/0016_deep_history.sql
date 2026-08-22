-- Deep-history layer: new long-series sources, a climatology table computed
-- in SQL, and lag columns on correlations. Enabled by Supabase Pro
-- (database size headroom for ~2M ERA5 rows).

insert into sources (id, name, homepage, license, attribution, tier) values
  ('era5', 'Open-Meteo Historical (Copernicus ERA5)', 'https://open-meteo.com/en/docs/historical-weather-api',
   'CC BY 4.0; Open-Meteo free tier is non-commercial', 'Source: Open-Meteo / Copernicus ERA5', 1),
  ('noaa-gml', 'NOAA Global Monitoring Laboratory', 'https://gml.noaa.gov/ccgg/trends/',
   'Public domain (US Government)', 'Source: NOAA Global Monitoring Laboratory', 1),
  ('nasa-gistemp', 'NASA GISS Surface Temperature Analysis', 'https://data.giss.nasa.gov/gistemp/',
   'Public domain (US Government)', 'Source: NASA GISS GISTEMP v4', 1),
  ('nsidc', 'National Snow and Ice Data Center', 'https://nsidc.org/data/seaice_index',
   'NOAA@NSIDC, free with attribution', 'Source: NSIDC Sea Ice Index', 1),
  ('silso', 'SILSO, Royal Observatory of Belgium', 'https://www.sidc.be/SILSO/',
   'CC BY-NC 4.0', 'Source: WDC-SILSO, Royal Observatory of Belgium, Brussels', 1)
on conflict (id) do nothing;

-- Day-of-year climatology per series, computed from the full history.
create table if not exists climatology (
  series_id bigint not null references series (id) on delete cascade,
  doy       integer not null check (doy between 1 and 366),
  p10       double precision,
  p50       double precision,
  p90       double precision,
  min_value double precision,
  min_year  integer,
  max_value double precision,
  max_year  integer,
  n         integer not null,
  refreshed_at timestamptz not null default now(),
  primary key (series_id, doy)
);
alter table climatology enable row level security;
create policy "public read" on climatology for select to anon using (true);

-- Recompute climatology for every daily-or-finer series with at least
-- min_years of history. Aggregates sub-daily series to daily means first.
create or replace function refresh_climatology(min_years integer default 10)
returns bigint language sql as $$
  with daily as (
    select o.series_id,
           date_trunc('day', o.ts) as day,
           avg(o.value) as value
    from observations o
    join series s on s.id = o.series_id
    where o.value is not null
      and s.frequency in ('daily', 'hourly', '30 minutes', 'minute', '5 minutes')
    group by 1, 2
  ),
  eligible as (
    select series_id
    from daily
    group by series_id
    having count(distinct extract(year from day)) >= min_years
  ),
  ranked as (
    select d.series_id,
           extract(doy from d.day)::int as doy,
           extract(year from d.day)::int as yr,
           d.value
    from daily d
    join eligible e on e.series_id = d.series_id
  ),
  stats as (
    select series_id, doy,
           percentile_cont(0.1) within group (order by value) as p10,
           percentile_cont(0.5) within group (order by value) as p50,
           percentile_cont(0.9) within group (order by value) as p90,
           min(value) as min_value,
           max(value) as max_value,
           count(*)::int as n
    from ranked
    group by series_id, doy
  ),
  extremes as (
    select distinct on (series_id, doy, which) series_id, doy, which, yr
    from (
      select series_id, doy, yr, value, 'min' as which,
             row_number() over (partition by series_id, doy order by value asc) rn
      from ranked
      union all
      select series_id, doy, yr, value, 'max' as which,
             row_number() over (partition by series_id, doy order by value desc) rn
      from ranked
    ) t
    where rn = 1
  ),
  upserted as (
    insert into climatology (series_id, doy, p10, p50, p90, min_value, min_year, max_value, max_year, n, refreshed_at)
    select s.series_id, s.doy, s.p10, s.p50, s.p90, s.min_value, mn.yr, s.max_value, mx.yr, s.n, now()
    from stats s
    left join extremes mn on mn.series_id = s.series_id and mn.doy = s.doy and mn.which = 'min'
    left join extremes mx on mx.series_id = s.series_id and mx.doy = s.doy and mx.which = 'max'
    on conflict (series_id, doy) do update set
      p10 = excluded.p10, p50 = excluded.p50, p90 = excluded.p90,
      min_value = excluded.min_value, min_year = excluded.min_year,
      max_value = excluded.max_value, max_year = excluded.max_year,
      n = excluded.n, refreshed_at = excluded.refreshed_at
    returning 1
  )
  select count(*) from upserted;
$$;

-- Lead/lag: the r and offset (in days) that maximizes |r| of first differences.
alter table correlations add column if not exists lag_days integer;
alter table correlations add column if not exists r_lag double precision;
