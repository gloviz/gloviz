insert into sources (id, name, homepage, license, attribution, tier) values
  ('eurostat', 'Eurostat', 'https://ec.europa.eu/eurostat',
   'Free reuse with attribution', 'Source: Eurostat', 2),
  ('oecd', 'OECD', 'https://data-explorer.oecd.org/',
   'OECD terms, attribution required', 'Source: OECD', 1)
on conflict (id) do nothing;
