insert into sources (id, name, homepage, license, attribution, tier) values
  ('imf', 'International Monetary Fund', 'https://data.imf.org/',
   'IMF terms, attribution required', 'Source: International Monetary Fund', 1)
on conflict (id) do nothing;
