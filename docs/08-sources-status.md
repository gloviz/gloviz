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
| IMF | 1 | ~140 | Monthly, annual | CPI index and rate, plus WEO with published forecasts |

**Totals: 15 sources, ~1,280 series, ~373,000 observations.**

## Blocked or dropped

| Source | Status |
|---|---|
| **ENTSO-E** | Adapter written and tested; waiting on the API token, which is issued by email. The adapter declares `requiredEnv: ['ENTSOE_API_TOKEN']` and skips itself with a warning until the secret exists. |
| **IMF** | **Solved.** See below. |

## IMF: what actually works

The first attempt failed and the reasons are worth keeping:

1. The legacy `dataservices.imf.org` host is gone, and **IFS is no longer a
   dataflow**. The current flows are `IMF.STA:CPI(5.0.0)` and
   `IMF.RES:WEO(9.0.0)`; the version is mandatory in the path.
2. The SDMX **2.1** data endpoint returns HTTP 500 for these flows.
3. The SDMX **3.0** JSON endpoint answers 200 but every observation is null.
4. **SDMX-CSV 2.0 on the 3.0 endpoint is the format that returns numbers.**

```
GET https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/CPI/5.0.0/
    NOR+SWE.CPI._T.IX.M?c[TIME_PERIOD]=ge:2010-01
Accept: application/vnd.sdmx.data+csv;version=2.0
```

Periods come back as `2026-M07`, handled by `sdmxPeriodToIso`. The CSV parser
lives next to the JSON one in `lib/parsers/sdmx.ts` and is unit tested against
quoted cells, empty values and unparseable numbers.

WEO is the only global dataset here that ships a **published forecast**, so its
lines deliberately run past today. That makes it the natural counterpart to
Orbit's own Forecast tool: the IMF's projection against a statistical one.

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


## Insight layer (added 2026-08)

Three tables computed from the observations, populated by
`scripts/insights.ts` (nightly, 03:50 UTC) and by ingest itself:

| Table | Written by | Read by |
|---|---|---|
| `records` | insights job: latest value vs its own 90-day range | `/today`, ticker |
| `correlations` | insights job: Pearson r for same-cadence pairs, sampled and bounded | `/surprise`, explorer suggestions, `/today` |
| `forecasts` | **ingest** captures any observation with a future timestamp at the moment it exists; insights adds naive and drift baselines and scores everything whose target time has passed | `/forecasts` |

The forecast principle: GLOVIZ does not out-forecast the institutions, it keeps
their receipts. The naive baseline (tomorrow = today) is the honesty benchmark.
