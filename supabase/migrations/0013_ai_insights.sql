-- AI context layer. `facts` holds the verified numbers computed from the
-- database; `body` holds Claude's narrative around exactly those facts.
-- Pages render body next to facts, clearly labelled as AI interpretation.

create table if not exists insights (
  id          bigint generated always as identity primary key,
  series_id   bigint references series (id) on delete cascade,
  kind        text not null check (kind in ('record', 'extreme', 'correlation', 'daily')),
  headline    text not null,
  body        text not null,
  facts       jsonb not null,
  model       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists insights_fresh on insights (created_at desc);

alter table insights enable row level security;
create policy "public read" on insights for select to anon using (true);
