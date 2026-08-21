insert into sources (id, name, homepage, license, attribution, tier) values
  ('ecb', 'European Central Bank', 'https://data.ecb.europa.eu/',
   'Free with attribution', 'Source: European Central Bank', 1),
  ('usgs', 'USGS Earthquake Hazards Program', 'https://earthquake.usgs.gov/',
   'Public domain', 'Source: U.S. Geological Survey', 1)
on conflict (id) do nothing;
