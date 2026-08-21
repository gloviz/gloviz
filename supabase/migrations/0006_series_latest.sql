-- Latest observation per series: powers ranked bars, maps, treemaps and scatters
-- without pulling whole time series into the page.
create or replace view series_latest as
select distinct on (o.series_id)
  o.series_id, o.ts, o.value
from observations o
where o.value is not null
order by o.series_id, o.ts desc;
