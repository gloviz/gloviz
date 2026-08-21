# GLOVIZ

A live open-data observatory at [gloviz.app](https://gloviz.app): economy,
energy, climate, environment, health and transport for 190+ countries, streamed
from global and regional open APIs and analysed in-chart with Highcharts Orbit.

**Stack:** Next.js on Vercel · Supabase Postgres · ingestion in GitHub Actions.

## Architecture

The browser never touches an upstream API. Adapters normalize open-data APIs
into Supabase (hourly GitHub Actions cron); Next.js reads Supabase and caches at
the Vercel edge. See `docs/` in the project workspace for full context.

## Development

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev
```

## Ingestion

```bash
npm run ingest                              # every job
npm run ingest entsoe:day-ahead             # one job
npm run ingest entsoe:day-ahead -- --days 30  # backfill
```

Runs hourly at :20 via `.github/workflows/ingest.yml`. Check `/status`.
