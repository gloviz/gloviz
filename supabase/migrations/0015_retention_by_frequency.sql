-- Retention must never touch low-frequency history. The original
-- prune_observations deleted every observation older than the cutoff,
-- which on 2026-08-22 wiped all annual history (WHO entirely, World Bank
-- and FRED back to 1950 truncated to 5 years). Only sub-daily telemetry
-- has the volume that retention exists for; daily and slower series are
-- tiny and irreplaceable.
create or replace function prune_observations(keep interval)
returns bigint language sql as $$
  with deleted as (
    delete from observations o
    using series s
    where s.id = o.series_id
      and s.frequency in ('hourly', '30 minutes', 'minute', '5 minutes')
      and o.ts < now() - keep
    returning 1
  )
  select count(*) from deleted;
$$;
