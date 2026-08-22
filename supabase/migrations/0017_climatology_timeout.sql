-- refresh_climatology scans every daily/hourly observation (30+ seconds).
-- PostgREST's default statement timeout killed the nightly rpc call, so the
-- climatology table silently stayed empty. Give the function its own limit.
alter function refresh_climatology(integer) set statement_timeout = '300s';
-- The function-level SET cannot help: statement_timeout is read when the
-- top-level statement starts, so the role's limit governs the rpc call.
-- The service role is only used by ingestion and the insights job.
alter role service_role set statement_timeout = '300s';
