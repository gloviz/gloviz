insert into sources (id, name, homepage, license, attribution, tier) values
  ('entsoe', 'ENTSO-E Transparency Platform', 'https://transparency.entsoe.eu/',
   'ENTSO-E terms', 'Source: ENTSO-E Transparency Platform', 2)
on conflict (id) do nothing;
