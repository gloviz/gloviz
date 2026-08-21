# 08 · Source status

What is live in the database right now, and what is blocked. Counts verified
against Supabase on 2026-08-21.

## Live

| Source | Tier | Series | Cadence | Notes |
|---|---|---|---|---|
| World Bank | 1 | 539 | Annual | 12 indicators across 45 economies |
| Open-Meteo | 1 | 120 | Hourly | 30 cities, 4 variables, 3-day forecast. **Free tier is non-commercial** |
| Our World in Data | 1 | 116 | Annual | CO2, CO2 per capita, energy use, renewable share |
| WHO GHO | 1 | 112 | Annual | Life expectancy, healthy life expectancy, NCD mortality, alcohol |
| Eurostat | 2 | ~90 | Monthly, annual | Through the shared JSON-stat parser |
| OECD | 1 | 24 | Monthly | Through the shared SDMX-JSON parser |
| GBIF | 1 | 36 | Annual | Occurrences per country and per kingdom |
| NASA POWER | 1 | 24 | Daily | Solar irradiance and temperature, 12 sites |
| ECB | 1 | 20 | Daily | 20 FX reference rates |
| FRED | 1 | 18 | Daily | Rates, oil, gas, equities, VIX, spreads, US macro |
| OpenAQ | 1 | 23 | Daily | PM2.5, PM10, NO2 in 12 cities |
| USGS | 1 | 7 | Daily | M4.0+ counts, max magnitude, energy, per region |
| OpenSky | 1 | 12 | Hourly snapshots | **Non-commercial only.** Each run appends one point |

**Totals: 14 sources, 1,140 series, ~356,000 observations.**

## Blocked or dropped

| Source | Status |
|---|---|
| **ENTSO-E** | Adapter written and tested; waiting on the API token, which is issued by email. The adapter declares `requiredEnv: ['ENTSOE_API_TOKEN']` and skips itself with a warning until the secret exists. |
| **IMF** | Dropped for now. The current api.imf.org SDMX 2.1 service returns 404 for the IFS and CPI dataflows we need, and the legacy `dataservices.imf.org` host is unreachable. Revisit when the new API stabilises; the SDMX parser is already in place. |

## Reuse that paid off

- **One JSON-stat parser** (`lib/parsers/jsonstat.ts`) serves Eurostat today and
  will serve SSB, SCB and Statistics Finland unchanged.
- **One SDMX-JSON parser** (`lib/parsers/sdmx.ts`) serves OECD today and any
  other SDMX provider later. Both are unit tested against sparse cubes, array
  and object value forms, and every period format (`2026`, `2026-Q3`, `2026-02`,
  `2026M02`, `2026-02-03`).

## Ingest cadence

| Trigger | Jobs |
|---|---|
| Hourly, `:20` | open-meteo, entsoe, opensky |
| Daily, 06:40 UTC | ecb, usgs, nasa-power |
| Weekly, Sundays 03:10 UTC | worldbank, owid, who, eurostat, oecd, gbif |
| Nightly, 02:30 UTC | retention sweep, `prune_observations('5 years')` |

FRED is revised constantly and is re-read on a five-year window whenever it runs.
