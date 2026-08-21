insert into sources (id, name, homepage, license, attribution, tier) values
  ('open-meteo', 'Open-Meteo', 'https://open-meteo.com/',
   'CC BY 4.0 (free tier non-commercial)', 'Weather data by Open-Meteo.com', 1),
  ('worldbank', 'World Bank Open Data', 'https://data.worldbank.org/',
   'CC BY 4.0', 'Source: World Bank Open Data', 1)
on conflict (id) do nothing;
