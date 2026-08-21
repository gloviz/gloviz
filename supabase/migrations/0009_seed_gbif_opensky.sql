insert into sources (id, name, homepage, license, attribution, tier) values
  ('gbif', 'GBIF, Global Biodiversity Information Facility', 'https://www.gbif.org/',
   'CC0 / CC BY per record', 'Source: GBIF.org', 1),
  ('opensky', 'The OpenSky Network', 'https://opensky-network.org/',
   'Non-commercial research use only', 'Source: The OpenSky Network', 1)
on conflict (id) do nothing;
