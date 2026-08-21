insert into sources (id, name, homepage, license, attribution, tier) values
  ('energidataservice', 'Energi Data Service (Energinet)', 'https://www.energidataservice.dk/',
   'Free reuse with attribution', 'Source: Energi Data Service, Energinet', 3),
  ('carbonintensity', 'National Grid Carbon Intensity API', 'https://carbonintensity.org.uk/',
   'CC BY 4.0', 'Source: National Grid ESO Carbon Intensity API', 3),
  ('ssb', 'Statistics Norway', 'https://www.ssb.no/en/statbank',
   'CC BY 4.0', 'Source: Statistics Norway', 3)
on conflict (id) do nothing;
