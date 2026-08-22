-- Credibility signals for correlations.
-- r_diff: Pearson r computed on first differences. Two trending series always
-- correlate in levels; only genuine co-movement survives differencing.
-- geo_match: both series describe the same geography, which gives a plausible
-- mechanism (Danish wind and Danish CO2) rather than a coincidence.
alter table correlations add column if not exists r_diff double precision;
alter table correlations add column if not exists geo_match boolean not null default false;
