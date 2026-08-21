insert into sources (id, name, homepage, license, attribution, tier) values
  ('owid', 'Our World in Data', 'https://ourworldindata.org/',
   'CC BY 4.0', 'Source: Our World in Data', 1),
  ('who', 'WHO Global Health Observatory', 'https://www.who.int/data/gho',
   'CC BY-NC-SA 3.0 IGO', 'Source: WHO Global Health Observatory', 1),
  ('nasa-power', 'NASA POWER', 'https://power.larc.nasa.gov/',
   'Public domain', 'Source: NASA POWER Project', 1)
on conflict (id) do nothing;
